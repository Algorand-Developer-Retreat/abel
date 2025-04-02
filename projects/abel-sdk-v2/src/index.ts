import { TransactionSignerAccount } from "@algorandfoundation/algokit-utils/types/account";
import { decodeAddress, decodeUint64, encodeAddress, encodeUint64, makeEmptyTransactionSigner } from "algosdk";
import { AlgorandClient } from "@algorandfoundation/algokit-utils";
import { BoxName } from "@algorandfoundation/algokit-utils/types/app";
import {
  AssetLabelingClient,
  AssetLabelingFactory,
  LabelDescriptorFromTuple as LabelDescriptorBoxValueFromTuple,
} from "./generated/abel-contract-client.js";
import {ABISendResponse, AnyFn, LabelDescriptor, SendResponse} from "./types.js";
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

/**
 * Represents an SDK for managing asset labeling on the Algorand blockchain.
 * This class provides methods for reading and modifying asset labels,
 * as well as managing label operators and interacting with the blockchain.
 */
export class AbelSDK {
  /**
   * Represents an instance of the AssetLabelingClient used to interact with
   * asset labeling services. This client provides functionality to manage
   * and retrieve information about labeled assets within the system.
   *
   * The `readClient` is typically used for read-only operations, such as
   * querying or fetching asset labeling data, and is configured to maintain
   * a connection with the relevant backend services.
   *
   * > [!Note]
   * > that this variable does not handle write or modification tasks and
   * > should be used solely for read-access.
   */
  readClient: AssetLabelingClient;
  /**
   * Represents a client for asset labeling operations.
   * The client may be defined or undefined based on its initialization state.
   * When defined, it provides methods and functionalities for asset labeling tasks.
   * When undefined, it indicates that the client has not been initialized or is not available.
   */
  writeClient: AssetLabelingClient | undefined;
  /**
   * Represents an optional account used for signing transactions.
   *
   * The `writeAccount` variable may either be an instance of `TransactionSignerAccount` or `undefined`.
   * This account is typically used to authorize or sign transaction operations within the system.
   * If undefined, it implies that no specific signing account has been assigned.
   */
  writeAccount?: TransactionSignerAccount | undefined;

  /**
   * Constructor for initializing the client with configurations for performing read and write operations.
   *
   * @param {Object} params - The initialization parameters.
   * @param {AlgorandClient} params.algorand - The Algorand client instance used for interacting with the blockchain.
   * @param {bigint} params.appId - The application ID associated with the client.
   * @param {string} [params.readAccount=DEFAULT_READ_ACCOUNT] - The default account used for read operations. Defaults to a funded address used across public ALGO networks.
   * @param {TransactionSignerAccount} [params.writeAccount] - The account used for transactions requiring write access, including the address and signer details.
   *
   * @return {void} Initializes clients for read and write operations based on the provided configuration.
   */
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

  /**
   * Retrieves the application ID associated with the current client.
   *
   * @return {string} The application ID.
   */
  get appId() {
    return this.readClient.appId;
  }

  //  Box bead wrappers

  /**
   * Retrieves all labels by fetching boxes of length 2 and extracting their names.
   *
   * @return {Promise<string[]>} A promise that resolves to an array of label names.
   */
  async getAllLabels(): Promise<string[]> {
    return (await this.getBoxesByLength(2)).map((boxName) => boxName.name);
  }

  /**
   * Retrieves all operator names by processing and encoding box names with a specified length.
   *
   * @return {Promise<string[]>} A promise that resolves to an array of encoded operator names.
   */
  async getAllOperators(): Promise<string[]> {
    return (await this.getBoxesByLength(32)).map((boxName) => encodeAddress(boxName.nameRaw));
  }

  /**
   * Retrieves all asset IDs by fetching boxes of a specific length
   * and decoding their names into 64-bit unsigned integers.
   *
   * @return {Promise<bigint[]>} A promise that resolves to an array of 64-bit unsigned integer asset IDs.
   */
  async getAllAssetIDs(): Promise<bigint[]> {
    return (await this.getBoxesByLength(8)).map((boxName) => decodeUint64(boxName.nameRaw, "bigint"));
  }

  /**
   * Retrieves the label descriptor for the specified label ID.
   *
   * We simulate from a client configured with a (theoretically) known-good account on all networks, default dev fee sink
   *
   * @param {string} labelId - The unique identifier for the label.
   * @return {Promise<LabelDescriptor | null>} A promise that resolves to the label descriptor object if found,
   * or null if the label does not exist.
   */
  async getLabelDescriptor(labelId: string): Promise<LabelDescriptor | null> {
    try {
      const {
        returns: [labelDescriptorValue],
      } = await wrapErrors(
        this.readClient
          .newGroup()
          .getLabel({ args: { id: labelId }, boxReferences: [labelId] })
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

  /**
   * Retrieves label descriptors for the given list of label IDs.
   *
   * @param labelIds An array of label IDs for which the label descriptors are required.
   * @return A promise resolving to a map where the keys are label IDs and the values are the corresponding {@link LabelDescriptor} objects.
   */
  async getLabelDescriptors(labelIds: string[]): Promise<Map<string, LabelDescriptor>> {
    const { confirmations } = await wrapErrors(
      this.readClient
        .newGroup()
        .logLabels({ args: { ids: labelIds }, boxReferences: labelIds })
        .simulate(SIMULATE_PARAMS)
    );

    const logs = confirmations[0]!.logs ?? [];

    const labelDescriptors: Map<string, LabelDescriptor> = new Map();

    const descriptorValues = this.parseLogsAs(logs, LabelDescriptorBoxValueFromTuple, "get_label");

    descriptorValues.forEach((descriptorValue, idx) => {
      const id = labelIds[idx];
      //@ts-expect-error, msft plz be quiet. FIXME: need to patch this up
      labelDescriptors.set(id, { id, ...descriptorValue });
    });

    return labelDescriptors;
  }

  /**
   * Retrieves the labels associated with a specific operator.
   *
   * @param {string} operator - The identifier of the operator whose labels are to be retrieved.
   * @return {Promise<string[]>} A promise that resolves to an array of operator labels.
   */
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

  /**
   * Retrieves the labels associated with a given asset.
   *
   * @param {bigint} assetId - The unique identifier of the asset for which labels are to be fetched.
   * @return {Promise<string[]>} A promise that resolves to an array of labels associated with the asset.
   */
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

  /**
   * Retrieves labels associated with the given asset IDs.
   *
   * @param {bigint[]} assetIds - An array of asset IDs for which labels need to be retrieved.
   * @return {Promise<Map<bigint, string[]>>} A promise that resolves to a Map where each key is an asset ID (bigint)
   * and the value is an array of labels (string[]) associated with that asset.
   */
  async getAssetsLabels(assetIds: bigint[]): Promise<Map<bigint, string[]>> {
    const {
      returns: [assetsLabels],
    } = await wrapErrors(
      this.readClient
        .newGroup()
        .getAssetsLabels({ args: { assets: assetIds }, boxReferences: assetIds.map((a) => encodeUint64(a)) })
        .simulate(SIMULATE_PARAMS)
    );

    const map: Map<bigint, string[]> = new Map();
    assetsLabels?.forEach((assetLabels, idx) => {
      map.set(assetIds[idx], assetLabels);
    });

    return map;
  }

  /**
   * Adds a label to the system with the specified ID and name.
   *
   * @param {string} labelId - The unique identifier for the label to be added.
   * @param {string} name - The name of the label to be created.
   * @return {Promise<SendResponse>} A promise that resolves to the result of the label addition operation, including transaction details or errors.
   */
  async addLabel(labelId: string, name: string): Promise<SendResponse> {
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

    return wrapErrors<typeof query>(query);
  }

  /**
   * Removes a label with the specified ID.
   *
   * @param {string} labelId - The unique identifier of the label to be removed.
   * @return {Promise<ABISendResponse>} A promise that resolves to the result of the removeLabel operation.
   */
  async removeLabel(labelId: string): Promise<ABISendResponse> {
    this.requireWriteClient();
    const query = this.writeClient.send.removeLabel({
      args: {
        id: labelId,
      },
      boxReferences: [labelId],
    });
    return wrapErrors(query);
  }

  /**
   * Adds an operator to a specified label.
   *
   * @param {string} operator - The identifier of the operator to be added.
   * @param {string} labelId - The identifier of the label to which the operator will be added.
   * @return {Promise<ABISendResponse>} A promise resolving with the result of the operation wrapped in error handling.
   */
  async addOperatorToLabel(operator: string, labelId: string): Promise<ABISendResponse> {
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

  /**
   * Removes an operator from a specified label by sending a query to the write client.
   *
   * @param {string} operator - The operator to be removed from the label.
   * @param {string} labelId - The unique identifier of the label from which the operator will be removed.
   * @return {Promise<ABISendResponse>} A promise resolving to the result of the operation, or errors wrapped if any occur.
   */
  async removeOperatorFromLabel(operator: string, labelId: string): Promise<ABISendResponse> {
    this.requireWriteClient();
    const query = await this.writeClient.send.removeOperatorFromLabel({
      args: { operator, label: labelId },
      boxReferences: [decodeAddress(operator).publicKey, labelId],
    });
    return wrapErrors(query);
  }

  /**
   * Associates a label with a specified asset in the system.
   *
   * @param {bigint} assetId - The unique identifier of the asset to which the label will be added.
   * @param {string} labelId - The identifier of the label to be associated with the asset.
   * @return {Promise<ABISendResponse>} A promise that resolves to the result of the operation, or rejects with an error if the operation fails.
   */
  async addLabelToAsset(assetId: bigint, labelId: string): Promise<ABISendResponse> {
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

  /**
   * Removes a specified label from a given asset.
   *
   * @param {bigint} assetId - The unique identifier of the asset from which the label will be removed.
   * @param {string} labelId - The identifier of the label to be removed from the asset.
   * @return {Promise<ABISendResponse>} A promise resolving to the response of the operation indicating its result.
   */
  async removeLabelFromAsset(assetId: bigint, labelId: string): Promise<ABISendResponse> {
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

  /* Utils */

  /**
   * Retrieves an array of box names filtered by the specified length.
   *
   * @param {number} length - The length to filter the box names by.
   * @return {Promise<BoxName[]>} A promise that resolves to an array of box names with the specified length.
   */
  private async getBoxesByLength(length: number): Promise<BoxName[]> {
    const boxNames = await this.readClient.algorand.app.getBoxNames(this.appId);
    return boxNames.filter((boxName) => boxName.nameRaw.length === length);
  }

  /**
   * Parses a list of arc4 structs from logs using a provided tuple parser and an ABI decoding method.
   *
   *  tupleParser is like generated clients' xyzArcStructFromTuple
   *    abiDecodingMethod is a method name that returns the same avi return type as we are logging
   *    e.g. if we are parsing log_label_descriptors() logs that logs LabelDescriptor,
   *    abiDecodingMethod can be get_label_descriptor that has ABI return LabelDescriptor
   *
   * @param {Uint8Array[]} logs - An array of logs represented as Uint8Arrays to be parsed.
   * @param {T} tupleParser - A function used to parse the decoded data from the logs.
   * @param {string} abiDecodingMethodName - The name of the ABI decoding method that describes the log structure.
   * @return {ReturnType<T>[]} The array of parsed logs returned by the tuple parser.
   */
  parseLogsAs<T extends AnyFn>(logs: Uint8Array[], tupleParser: T, abiDecodingMethodName: string): T[] {
    const decodingMethod = this.readClient.appClient.getABIMethod(abiDecodingMethodName);
    const parsed = logs.map((logValue) =>
      tupleParser(
        // @ts-ignore TODO fixable?
        decodingMethod.returns.type.decode(logValue)
      )
    );
    return parsed;
  }


  /**
   * Ensures that the current instance has the required `writeAccount` and `writeClient` properties for performing transaction operations.
   * Throws an error if the instance is in a read-only state.
   *
   * @return Asserts the instance includes `writeAccount` with `TransactionSignerAccount` and `writeClient` with `AssetLabelingClient`.
   */
  requireWriteClient(): asserts this is this & { writeAccount: TransactionSignerAccount } & { writeClient: AssetLabelingClient } {
    if (this.writeAccount === undefined || this.writeClient === undefined) {
      throw new Error(`A transaction operation was issued on a read-only client`);
    }
  }
}
