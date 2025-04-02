import { TransactionSignerAccount } from "@algorandfoundation/algokit-utils/types/account";
import { decodeAddress, decodeUint64, encodeAddress, encodeUint64, makeEmptyTransactionSigner } from "algosdk";
import { AlgorandClient } from "@algorandfoundation/algokit-utils";
import { BoxName } from "@algorandfoundation/algokit-utils/types/app";
import pMap from "p-map";
import {
  AssetLabelingClient,
  AssetLabelingFactory,
  AssetMicro,
  AssetMicroFromTuple,
  LabelDescriptorFromTuple as LabelDescriptorBoxValueFromTuple,
} from "./generated/abel-contract-client.js";
import { AnyFn, FirstArgument, LabelDescriptor } from "./types.js";
import { chunk, mergeMapsArr, wrapErrors } from "./util.js";

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
  private concurrency: number = 2;

  constructor({
    algorand,
    appId,
    readAccount = DEFAULT_READ_ACCOUNT,
    writeAccount,
    concurrency,
  }: {
    algorand: AlgorandClient;
    appId: bigint;
    writeAccount?: TransactionSignerAccount;
    readAccount?: string;
    concurrency?: number;
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

    if (concurrency !== undefined) {
      this.concurrency = concurrency;
    }
  }

  get appId() {
    return this.readClient.appId;
  }

  //  Box bead wrappers

  async getAllLabels(): Promise<string[]> {
    return (await this.getBoxesByLength(2)).map((boxName) => boxName.name);
  }

  async getAllOperators(): Promise<string[]> {
    return (await this.getBoxesByLength(32)).map((boxName) => encodeAddress(boxName.nameRaw));
  }

  async getAllAssetIDs(): Promise<bigint[]> {
    return (await this.getBoxesByLength(8)).map((boxName) => decodeUint64(boxName.nameRaw, "bigint"));
  }

  /*
   * Registry Readers
   *
   * We simulate from a client configured with a (theoretically) known-good account on all networks, default dev fee sink
   */

  async getLabelDescriptor(labelId: string): Promise<LabelDescriptor | null> {
    try {
      const {
        returns: [labelDescriptorValue],
      } = await wrapErrors(
        this.readClient
          .newGroup()
          .getLabel({ args: { id: labelId } })
          .simulate(SIMULATE_PARAMS)
      );
      return { id: labelId, ...labelDescriptorValue! };
    } catch (e) {
      if ((e as Error).message === "ERR:NOEXIST") {
        return null;
      } else {
        throw e;
      }
    }
  }

  async getLabelDescriptors(labelIds: string[]): Promise<Map<string, LabelDescriptor>> {
    const { confirmations } = await wrapErrors(
      this.readClient
        .newGroup()
        .logLabels({ args: { ids: labelIds } })
        .simulate(SIMULATE_PARAMS)
    );

    const logs = confirmations[0]!.logs ?? [];
    const descriptorValues = this.parseLogsAs(logs, LabelDescriptorBoxValueFromTuple, "get_label");

    const labelDescriptors: Map<string, LabelDescriptor> = new Map();
    descriptorValues.forEach((descriptorValue, idx) => {
      const id = labelIds[idx];
      labelDescriptors.set(id, { id, ...descriptorValue });
    });

    return labelDescriptors;
  }

  async getOperatorLabels(operator: string): Promise<string[]> {
    const {
      returns: [operatorLabels],
    } = await wrapErrors(this.readClient.newGroup().getOperatorLabels({ args: { operator } }).simulate(SIMULATE_PARAMS));

    return operatorLabels!;
  }

  async getAssetLabels(assetId: bigint): Promise<string[]> {
    const {
      returns: [assetLabels],
    } = await wrapErrors(
      this.readClient
        .newGroup()
        .getAssetLabels({ args: { asset: assetId } })
        .simulate(SIMULATE_PARAMS)
    );

    return assetLabels!;
  }

  async getAssetsLabels(assetIds: bigint[]): Promise<Map<bigint, string[]>> {
    const {
      returns: [assetsLabels],
    } = await wrapErrors(
      this.readClient
        .newGroup()
        .getAssetsLabels({ args: { assets: assetIds } })
        .simulate(SIMULATE_PARAMS)
    );

    const map: Map<bigint, string[]> = new Map();
    assetsLabels?.forEach((assetLabels, idx) => {
      map.set(assetIds[idx], assetLabels);
    });

    return map;
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

  /* Batch fetch asset views */

  getAssetsMicro = async (assetIds: bigint[]): Promise<Map<bigint, AssetMicro & { id: bigint }>> => {
    const METHOD_MAX = 128;
    if (assetIds.length > METHOD_MAX) return this.batchCall(this.getAssetsMicro, assetIds, METHOD_MAX);

    const { confirmations } = await wrapErrors(
      this.readClient
        .newGroup()
        .getAssetsMicro({ args: { assets: assetIds } })
        .simulate(SIMULATE_PARAMS)
    );

    const assetValues = this.parseLogsAs(confirmations[0]!.logs ?? [], AssetMicroFromTuple, "get_asset_micro");
    return new Map(assetValues.map((descriptorValue, idx) => [assetIds[idx], { id: assetIds[idx], ...descriptorValue }]));
  };

  /* Utils */

  private async getBoxesByLength(length: number): Promise<BoxName[]> {
    const boxNames = await this.readClient.algorand.app.getBoxNames(this.appId);
    return boxNames.filter((boxName) => boxName.nameRaw.length === length);
  }

  /*
   * parse typed arc4 structs from logs
   *
   * tupleParser is like generated clients' xyzArcStructFromTuple
   * abiDecodingMethod is a method name that returns the same avi return type as we are logging
   *    e.g. if we are parsing log_label_descriptors() logs that logs LabelDescriptor, abiDecodingMethod can be get_label_descriptor that has ABI return LabelDescriptor
   */
  parseLogsAs<T extends AnyFn>(logs: Uint8Array[], tupleParser: T, abiDecodingMethodName: string): ReturnType<T>[] {
    const decodingMethod = this.readClient.appClient.getABIMethod(abiDecodingMethodName);
    const parsed = logs.map((logValue) =>
      tupleParser(
        // @ts-ignore TODO fixable?
        decodingMethod.returns.type.decode(logValue)
      )
    );
    return parsed;
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
   * pMap batcher, merge maps after
   *
   * decorator pattern instead would be nice but ... eh
   */
  async batchCall<T extends AnyFn>(method: T, args: FirstArgument<T>, methodMax: number): Promise<ReturnType<T>> {
    const chunked = chunk(args, methodMax);
    const res: ReturnType<T>[] = await pMap(chunked, (arg) => method(arg), { concurrency: this.concurrency });
    // @ts-ignore
    return mergeMapsArr(res);
  }
}
