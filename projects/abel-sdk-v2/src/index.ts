import { AlgorandClient } from "@algorandfoundation/algokit-utils";
import { TransactionSignerAccount } from "@algorandfoundation/algokit-utils/types/account";
import { BoxName } from "@algorandfoundation/algokit-utils/types/app";
import { decodeAddress, decodeUint64, encodeAddress, encodeUint64, makeEmptyTransactionSigner } from "algosdk";
import pMap from "p-map";
import {
  AssetFullFromTuple,
  AssetLabelingClient,
  AssetLabelingFactory,
  AssetMicroFromTuple,
  AssetMicroLabelsFromTuple,
  AssetSmallFromTuple,
  AssetTextFromTuple,
  AssetTextLabelsFromTuple,
  AssetTinyFromTuple,
  AssetTinyLabelsFromTuple,
  LabelDescriptorFromTuple as LabelDescriptorBoxValueFromTuple,
} from "./generated/abel-contract-client.js";
import {
  ABISendResponse,
  AnyFn,
  AssetFull,
  AssetMicro,
  AssetMicroLabels,
  AssetSmall,
  AssetText,
  AssetTextLabels,
  AssetTiny,
  AssetTinyLabels,
  LabelDescriptor,
  QueryReturn,
  SendResponse,
} from "./types.js";
import { chunk, encodeUint64Arr, isNullish, mergeMapsArr, wrapErrors } from "./util.js";

export * from "./types.js";
export { AssetLabelingClient, AssetLabelingFactory };

const DEFAULT_READ_ACCOUNT = "A7NMWS3NT3IUDMLVO26ULGXGIIOUQ3ND2TXSER6EBGRZNOBOUIQXHIBGDE";
const SIMULATE_PARAMS = {
  allowMoreLogging: true,
  allowUnnamedResources: true,
  extraOpcodeBudget: 179200,
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
  private concurrency: number = 2;

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
    concurrency,
  }: {
    algorand: AlgorandClient;
    appId: bigint;
    writeAccount?: TransactionSignerAccount;
    readAccount?: string;
    concurrency?: number;
  }) {
    // Client used for read queries. Sender can be any funded address.
    // Default read is the A7N.. fee sink which is funded on all public ALGO networks
    // (localnet may be zero or at min balance though)
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
   * Retrieves all operator names by processing and encoding box names with a specified length (32).
   *
   * @return {Promise<string[]>} A promise that resolves to an array of encoded operator names.
   */
  async getAllOperators(): Promise<string[]> {
    return (await this.getBoxesByLength(32)).map((boxName) => encodeAddress(boxName.nameRaw));
  }

  /**
   * Retrieves all asset IDs by fetching boxes of a specific length (8)
   * and decoding their names into 64-bit unsigned integers.
   *
   * @return {Promise<bigint[]>} A promise that resolves to an array of 64-bit unsigned integer asset IDs.
   */
  async getAllAssetIDs(): Promise<bigint[]> {
    return (await this.getBoxesByLength(8)).map((boxName) => decodeUint64(boxName.nameRaw, "bigint"));
  }

  /**
   * Retrieves the existence of label by ID.
   *
   * @param {string} labelId - The unique identifier for the label.
   * @return {Promise<boolean>} A promise that resolves to true if a label with the provided ID exists, or false otherwise.
   */
  async hasLabel(labelId: string): Promise<boolean> {
    const {
      returns: [hasLabel],
    } = await wrapErrors(
      this.readClient
        .newGroup()
        .hasLabel({ args: { id: labelId } })
        .simulate(SIMULATE_PARAMS)
    );
    return Boolean(hasLabel);
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

  /**
   * Retrieves the labels associated with a specific operator.
   *
   * @param {string} operator - The identifier of the operator whose labels are to be retrieved.
   * @return {Promise<string[]>} A promise that resolves to an array of operator labels.
   */
  async hasOperatorLabel(operator: string, label: string): Promise<boolean> {
    const {
      returns: [hasLabel],
    } = await wrapErrors(this.readClient.newGroup().hasOperatorLabel({ args: { operator, label } }).simulate(SIMULATE_PARAMS));
    return Boolean(hasLabel);
  }

  async getOperatorLabels(operator: string): Promise<string[]> {
    const {
      returns: [operatorLabels],
    } = await wrapErrors(this.readClient.newGroup().getOperatorLabels({ args: { operator } }).simulate(SIMULATE_PARAMS));

    return operatorLabels!;
  }

  async hasAssetLabel(assetId: bigint, label: string): Promise<boolean> {
    const {
      returns: [hasLabel],
    } = await wrapErrors(this.readClient.newGroup().hasAssetLabel({ args: { assetId, label } }).simulate(SIMULATE_PARAMS));
    return Boolean(hasLabel);
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
        .getAssetLabels({ args: { asset: assetId } })
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
  getAssetsLabels = async (assetIds: bigint[]): Promise<Map<bigint, string[]>> => {
    const METHOD_MAX = 128;
    if (assetIds.length > METHOD_MAX) return this.batchCall(this.getAssetsLabels, [assetIds], METHOD_MAX);

    const { confirmations } = await wrapErrors(
      this.readClient
        .newGroup()
        .logAssetsLabels({ args: { assets: assetIds } })
        .simulate(SIMULATE_PARAMS)
    );

    const map: Map<bigint, string[]> = new Map();

    const labelValues = this.parseLogsAs(
      confirmations[0]!.logs ?? [],
      (arrs: Uint8Array[]) => arrs.map((arr) => Buffer.from(arr).toString()),
      "get_asset_labels"
    );

    assetIds.forEach((assetId, idx) => {
      map.set(assetId, labelValues[idx]);
    });

    return map;
  };

  /**
   * Adds a label to the system with the specified ID and name.
   *
   * @param {string} labelId - The unique identifier for the label to be added.
   * @param {string} name - The name of the label to be created.
   * @param {string} url - The url of the label to be created.
   * @return {Promise<SendResponse>} A promise that resolves to the result of the label addition operation, including transaction details or errors.
   */
  async addLabel(labelId: string, name: string, url: string): Promise<SendResponse> {
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
      .addLabel({ args: { id: labelId, name, url }, boxReferences: [labelId] })
      .send();

    return wrapErrors(query);
  }

  async changeLabel(labelId: string, name: string, url: string) {
    this.requireWriteClient();

    if (isNullish(name)) throw new Error("name must be defined");
    if (isNullish(url)) throw new Error("url must be defined");

    const query = this.writeClient
      .newGroup()
      .changeLabel({ args: { id: labelId, name, url }, boxReferences: [labelId] })
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
   * Associates a label with a multiple assets.
   *
   * @param {bigint[]} assetIds - The asset IDs to which the label will be added.
   * @param {string} labelId - The identifier of the label to be associated with the assets.
   * @return {Promise<SendResponse | SendResponse[]>} A promise that resolves to the result(s) of the operation, or rejects with an error if the operation fails.
   */
  addLabelToAssets = async (assetIds: bigint[], labelId: string): Promise<SendResponse | SendResponse[]> => {
    this.requireWriteClient();

    const METHOD_MAX = 6 + 8 * 15;
    if (assetIds.length > METHOD_MAX) {
      const chunked = chunk(assetIds, METHOD_MAX);
      return pMap(chunked, (assetIds) => this.addLabelToAssets(assetIds, labelId) as Promise<SendResponse>, {
        concurrency: this.concurrency,
      });
    }

    let query = this.writeClient.newGroup();

    const operatorBox = decodeAddress(this.writeAccount.addr).publicKey;
    // we need 2 refs for the first call only
    // we push two zero and adapt boxRefs in first call
    const AssetChunks = chunk([0n, 0n, ...assetIds], 8);

    for (let i = 0; i < AssetChunks.length; i++) {
      // first box ref has label and acct. rest are all asset IDs
      const assetIds = i === 0 ? AssetChunks[i].slice(2) : AssetChunks[i];
      const boxReferences = i === 0 ? [labelId, operatorBox, ...encodeUint64Arr(assetIds)] : encodeUint64Arr(assetIds);

      query.addLabelToAssets({
        args: {
          assets: assetIds,
          label: labelId,
        },
        boxReferences,
      });
    }

    return wrapErrors(query.send());
  };

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

  /* Batch fetch asset views */

  getAssetsMicro = async (assetIds: bigint[]): Promise<Map<bigint, AssetMicro>> => {
    const METHOD_MAX = 128;
    if (assetIds.length > METHOD_MAX) return this.batchCall(this.getAssetsMicro, [assetIds], METHOD_MAX);

    const { confirmations } = await wrapErrors(
      this.readClient
        .newGroup()
        .getAssetsMicro({ args: { assets: assetIds } })
        .simulate(SIMULATE_PARAMS)
    );

    const assetValues = this.parseLogsAs(confirmations[0]!.logs ?? [], AssetMicroFromTuple, "get_asset_micro");
    return new Map(assetValues.map((descriptorValue, idx) => [assetIds[idx], { id: assetIds[idx], ...descriptorValue }]));
  };

  getAssetsMicroLabels = async (assetIds: bigint[]): Promise<Map<bigint, AssetMicroLabels>> => {
    const METHOD_MAX = 64;
    if (assetIds.length > METHOD_MAX) return this.batchCall(this.getAssetsMicroLabels, [assetIds], METHOD_MAX);

    const { confirmations } = await wrapErrors(
      this.readClient
        .newGroup()
        .getAssetsMicroLabels({ args: { assets: assetIds } })
        .simulate(SIMULATE_PARAMS)
    );

    const assetValues = this.parseLogsAs(confirmations[0]!.logs ?? [], AssetMicroLabelsFromTuple, "get_asset_micro_labels");
    return new Map(assetValues.map((descriptorValue, idx) => [assetIds[idx], { id: assetIds[idx], ...descriptorValue }]));
  };

  getAssetsTiny = async (assetIds: bigint[]): Promise<Map<bigint, AssetTiny>> => {
    const METHOD_MAX = 128;
    if (assetIds.length > METHOD_MAX) return this.batchCall(this.getAssetsTiny, [assetIds], METHOD_MAX);

    const { confirmations } = await wrapErrors(
      this.readClient
        .newGroup()
        .getAssetsTiny({ args: { assets: assetIds } })
        .simulate(SIMULATE_PARAMS)
    );

    const assetValues = this.parseLogsAs(confirmations[0]!.logs ?? [], AssetTinyFromTuple, "get_asset_tiny");
    return new Map(assetValues.map((descriptorValue, idx) => [assetIds[idx], { id: assetIds[idx], ...descriptorValue }]));
  };

  getAssetsTinyLabels = async (assetIds: bigint[]): Promise<Map<bigint, AssetTinyLabels>> => {
    const METHOD_MAX = 64;
    if (assetIds.length > METHOD_MAX) return this.batchCall(this.getAssetsTinyLabels, [assetIds], METHOD_MAX);

    const { confirmations } = await wrapErrors(
      this.readClient
        .newGroup()
        .getAssetsTinyLabels({ args: { assets: assetIds } })
        .simulate(SIMULATE_PARAMS)
    );

    const assetValues = this.parseLogsAs(confirmations[0]!.logs ?? [], AssetTinyLabelsFromTuple, "get_asset_tiny_labels");
    return new Map(assetValues.map((descriptorValue, idx) => [assetIds[idx], { id: assetIds[idx], ...descriptorValue }]));
  };

  getAssetsText = async (assetIds: bigint[]): Promise<Map<bigint, AssetText>> => {
    const METHOD_MAX = 128;
    if (assetIds.length > METHOD_MAX) return this.batchCall(this.getAssetsText, [assetIds], METHOD_MAX);

    const { confirmations } = await wrapErrors(
      this.readClient
        .newGroup()
        .getAssetsText({ args: { assets: assetIds } })
        .simulate(SIMULATE_PARAMS)
    );

    const assetValues = this.parseLogsAs(confirmations[0]!.logs ?? [], AssetTextFromTuple, "get_asset_text");
    return new Map(assetValues.map((descriptorValue, idx) => [assetIds[idx], { id: assetIds[idx], ...descriptorValue }]));
  };

  getAssetsTextLabels = async (assetIds: bigint[]): Promise<Map<bigint, AssetTextLabels>> => {
    const METHOD_MAX = 64;
    if (assetIds.length > METHOD_MAX) return this.batchCall(this.getAssetsTextLabels, [assetIds], METHOD_MAX);

    const { confirmations } = await wrapErrors(
      this.readClient
        .newGroup()
        .getAssetsTextLabels({ args: { assets: assetIds } })
        .simulate(SIMULATE_PARAMS)
    );

    const assetValues = this.parseLogsAs(confirmations[0]!.logs ?? [], AssetTextLabelsFromTuple, "get_asset_text_labels");
    return new Map(assetValues.map((descriptorValue, idx) => [assetIds[idx], { id: assetIds[idx], ...descriptorValue }]));
  };

  getAssetsSmall = async (assetIds: bigint[]): Promise<Map<bigint, AssetSmall>> => {
    const METHOD_MAX = 64;
    if (assetIds.length > METHOD_MAX) return this.batchCall(this.getAssetsSmall, [assetIds], METHOD_MAX);

    const { confirmations } = await wrapErrors(
      this.readClient
        .newGroup()
        .getAssetsSmall({ args: { assets: assetIds } })
        .simulate(SIMULATE_PARAMS)
    );

    const assetValues = this.parseLogsAs(confirmations[0]!.logs ?? [], AssetSmallFromTuple, "get_asset_small");
    return new Map(assetValues.map((descriptorValue, idx) => [assetIds[idx], { id: assetIds[idx], ...descriptorValue }]));
  };

  getAssetsFull = async (assetIds: bigint[]): Promise<Map<bigint, AssetFull>> => {
    const METHOD_MAX = 42;
    if (assetIds.length > METHOD_MAX) return this.batchCall(this.getAssetsFull, [assetIds], METHOD_MAX);

    const { confirmations } = await wrapErrors(
      this.readClient
        .newGroup()
        .getAssetsFull({ args: { assets: assetIds } })
        .simulate(SIMULATE_PARAMS)
    );

    const assetValues = this.parseLogsAs(confirmations[0]!.logs ?? [], AssetFullFromTuple, "get_asset_full");
    return new Map(assetValues.map((descriptorValue, idx) => [assetIds[idx], { id: assetIds[idx], ...descriptorValue }]));
  };

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
  parseLogsAs<T extends AnyFn>(logs: Uint8Array[], tupleParser: T, abiDecodingMethodName: string): ReturnType<T>[] {
    const decodingMethod = this.readClient.appClient.getABIMethod(abiDecodingMethodName);
    const parsed = logs.map((logValue) =>
      logValue.length
        ? tupleParser(
            // @ts-ignore TODO fixable?
            decodingMethod.returns.type.decode(logValue)
          )
        : { deleted: true }
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

  /*
   * pMap batcher, merge maps after
   *
   * decorator pattern instead would be nice but ... eh
   */
  async batchCall<T extends AnyFn>(method: T, [assetIDs, ...rest]: Parameters<T>, methodMax: number): Promise<ReturnType<T>> {
    const chunkedAssetIds = chunk(assetIDs, methodMax);
    const res = await pMap(chunkedAssetIds, (assetIDs) => method(assetIDs, ...rest), { concurrency: this.concurrency });
    // @ts-ignore
    return res[0] instanceof Map ? mergeMapsArr(res) : undefined;
  }
}
