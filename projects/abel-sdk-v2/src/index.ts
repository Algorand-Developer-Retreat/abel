import { TransactionSignerAccount } from "@algorandfoundation/algokit-utils/types/account";
import { decodeAddress, encodeUint64, makeEmptyTransactionSigner } from "algosdk";
import { AlgorandClient } from "@algorandfoundation/algokit-utils";
import { BoxName } from "@algorandfoundation/algokit-utils/types/app";
import {
  AssetLabelingClient,
  AssetLabelingFactory,
  LabelDescriptorFromTuple as LabelDescriptorBoxValueFromTuple,
} from "./generated/abel-contract-client.js";
import { LabelDescriptor } from "./types.js";
import { wrapErrors } from "./util.js";

export * from "./types.js";
export { AssetLabelingClient, AssetLabelingFactory };

const DEFAULT_READ_ACCOUNT = "A7NMWS3NT3IUDMLVO26ULGXGIIOUQ3ND2TXSER6EBGRZNOBOUIQXHIBGDE";
const SIMULATE_PARAMS = {
  allowMoreLogging: true,
  allowUnnamedResources: true,
  extraOpcodeBudget: 130013,
  fixSigners: true,
  allowEmptySignatures: true,
};

export class AbelSDK {
  readClient: AssetLabelingClient;
  writeClient: AssetLabelingClient | undefined;
  writeAccount?: TransactionSignerAccount | undefined;

  constructor({
    algorand,
    appId,
    readAccount = DEFAULT_READ_ACCOUNT,
    writeAccount,
  }: {
    algorand: AlgorandClient;
    appId: bigint;
    writeAccount?: TransactionSignerAccount;
    readAccount?: string;
  }) {
    // Client used for read queries. Sender can be any funded address.
    // Default read is the A7N.. fee sink which is funded on all public ALGO networks incl. localnet
    this.readClient = algorand.client.getTypedAppClientById(AssetLabelingClient, {
      appId,
      defaultSender: readAccount,
      defaultSigner: makeEmptyTransactionSigner(),
    });

    // tranascting requires a writeAccount
    if (writeAccount) {
      this.writeClient = algorand.client.getTypedAppClientById(AssetLabelingClient, {
        appId,
        defaultSender: writeAccount.addr,
        defaultSigner: writeAccount.signer,
      });
      this.writeAccount = writeAccount;
    }
  }

  get appId() {
    return this.readClient.appId;
  }

  private async getBoxesByLength(length: number): Promise<BoxName[]> {
    const boxNames = await this.readClient.algorand.app.getBoxNames(this.appId);
    return boxNames.filter((boxName) => boxName.name.length === 2);
  }

  /*
   * ts guard for write clients only
   */
  requireWriteClient(): asserts this is this & { writeAccount: TransactionSignerAccount } & { writeClient: AssetLabelingClient } {
    if (this.writeAccount === undefined || this.writeClient === undefined) {
      throw new Error(`A transaction operation was issued on a read-only client`);
    }
  }

  /*
   * Readers
   *
   * We simulate from a client configured with a (theoretically) known-good account on all networks, default dev fee sink
   */

  async getLabelDescriptor(labelId: string): Promise<LabelDescriptor> {
    const {
      returns: [labelDescriptorValue],
    } = await wrapErrors(
      this.readClient
        .newGroup()
        .getLabel({ args: { id: labelId }, boxReferences: [labelId] })
        .simulate(SIMULATE_PARAMS)
    );

    return { id: labelId, ...labelDescriptorValue! };
  }

  async getLabelDescriptors(labelIds: string[]): Promise<Map<string, LabelDescriptor>> {
    const labels = await this.getBoxesByLength(2);

    const { confirmations } = await wrapErrors(
      this.readClient
        .newGroup()
        .logLabels({ args: { ids: labelIds }, boxReferences: labelIds })
        .simulate(SIMULATE_PARAMS)
    );

    const logs = confirmations[0]!.logs ?? [];

    // find a method that returns the same value as we are logging
    const method = this.readClient.appClient.getABIMethod("get_label");

    const labelDescriptors: Map<string, LabelDescriptor> = new Map();

    logs.forEach((logValue: Uint8Array, idx) => {
      const id = labelIds[idx];
      const descriptorValue = LabelDescriptorBoxValueFromTuple(
        // @ts-ignore TODO fixable?
        method.returns.type.decode(logs[idx])
      );
      labelDescriptors.set(id, { id, ...descriptorValue });
    });

    return labelDescriptors;
  }

  async getOperatorLabels(operator: string): Promise<string[]> {
    const {
      returns: [operatorLabels],
    } = await wrapErrors(
      this.readClient
        .newGroup()
        .getOperatorLabels({ args: { operator }, boxReferences: [operator] })
        .simulate(SIMULATE_PARAMS)
    );

    return operatorLabels!;
  }

  async getAssetLabels(assetId: bigint): Promise<string[]> {
    const {
      returns: [assetLabels],
    } = await wrapErrors(
      this.readClient
        .newGroup()
        .getAssetLabels({ args: { asset: assetId }, boxReferences: [encodeUint64(assetId)] })
        .simulate(SIMULATE_PARAMS)
    );

    return assetLabels!;
  }

  /*
   * Write methods = transactions
   */

  async addLabel(labelId: string, name: string) {
    this.requireWriteClient();

    const query = this.writeClient
      .newGroup()
      .addTransaction(
        await this.writeClient.algorand.createTransaction.payment({
          sender: this.writeAccount.addr,
          receiver: this.writeClient.appAddress,
          amount: (0.2).algos(),
        }),
        this.writeAccount.signer
      )
      .addLabel({ args: { id: labelId, name }, boxReferences: [labelId] })
      .send();

    return wrapErrors(query);
  }

  async removeLabel(labelId: string) {
    this.requireWriteClient();
    const query = this.writeClient.send.removeLabel({
      args: {
        id: labelId,
      },
      boxReferences: [labelId],
    });
    return wrapErrors(query);
  }

  async addOperatorToLabel(operator: string, labelId: string) {
    this.requireWriteClient();
    const query = this.writeClient.send.addOperatorToLabel({
      args: {
        operator,
        label: labelId,
      },
      boxReferences: [decodeAddress(operator).publicKey, labelId],
    });

    return wrapErrors(query);
  }

  async removeOperatorFromLabel(operator: string, labelId: string) {
    this.requireWriteClient();
    const query = await this.writeClient.send.removeOperatorFromLabel({
      args: { operator, label: labelId },
      boxReferences: [decodeAddress(operator).publicKey, labelId],
    });
    return wrapErrors(query);
  }

  async addLabelToAsset(assetId: bigint, labelId: string) {
    this.requireWriteClient();
    const query = this.writeClient.send.addLabelToAsset({
      args: {
        asset: assetId,
        label: labelId,
      },
      boxReferences: [labelId, encodeUint64(assetId), decodeAddress(this.writeAccount.addr).publicKey],
    });
    return wrapErrors(query);
  }

  async removeLabelFromAsset(assetId: bigint, labelId: string) {
    this.requireWriteClient();
    const query = this.writeClient.send.removeLabelFromAsset({
      args: {
        asset: assetId,
        label: labelId,
      },
      boxReferences: [labelId, encodeUint64(assetId), decodeAddress(this.writeAccount.addr).publicKey],
    });
    return wrapErrors(query);
  }
}
