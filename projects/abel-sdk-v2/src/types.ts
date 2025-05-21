import { ABIReturn } from "@algorandfoundation/algokit-utils/types/app";
import { Transaction } from "algosdk";
import { PendingTransactionResponse } from "algosdk/dist/types/client/v2/algod/models/types.js";
import {
  LabelDescriptor as LabelDescriptorBoxValue,
  AssetMicro as AssetMicroValue,
  AssetMicroLabels as AssetMicroLabelsValue,
  AssetTiny as AssetTinyValue,
  AssetTinyLabels as AssetTinyLabelsValue,
  AssetText as AssetTextValue,
  AssetTextLabels as AssetTextLabelsValue,
  AssetSmall as AssetSmallValue,
  AssetFull as AssetFullValue,
} from "./generated/abel-contract-client.js";

/**
 * Represents the response structure for an ABI send operation.
 *
 * This type captures the output associated with sending a transaction
 * or set of transactions, including transaction identifiers, processing
 * results, and optional return values.
 */
export type ABISendResponse = {groupId: string, txIds: string[], returns?: ABIReturn[] | undefined, confirmations: PendingTransactionResponse[], transactions: Transaction[], confirmation: PendingTransactionResponse, transaction: Transaction, return: void | undefined}
/**
 * Represents the response returned after sending a transaction or a set of transactions.
 */
export type SendResponse = {groupId: string, txIds: string[], returns: ABIReturn[] & [void | undefined], confirmations: PendingTransactionResponse[], transactions: Transaction[]}
/**
 * Represents a label descriptor with associated properties and metadata.
 * This type combines the properties from `LabelDescriptorBoxValue` and adds
 * additional fields specific to the label, such as identifier, name, and
 * related asset and operator counts.
 *
 * Fields:
 * - `id`: A unique identifier for the label.
 * - `name`: The name associated with the label.
 * - `numAssets`: The total number of assets linked to the label.
 * - `numOperators`: The total number of operators associated with the label.
 *
 * This type is used to define and manage metadata for labels within a broader
 * context of asset and operator management systems.
 */
export type LabelDescriptor = LabelDescriptorBoxValue & {
  /**
   * A unique identifier represented as a string.
   * This variable is commonly used to uniquely distinguish an object, entity, or record.
   */
  id: string;
  /**
   * Represents the name as a string value.
   */
  name: string;
  /**
   * Represents the total number of assets.
   *
   * This variable holds the count of assets as a bigint, which allows for
   * representing very large numerical values that exceed the safety limits
   * of standard JavaScript number types.
   */
  numAssets: bigint;
  /**
   * Represents the total number of operators associated with a specific operation
   * or context. This value is stored as a BigInt to handle potentially large
   * numbers reliably without risk of overflow.
   */
  numOperators: bigint;
}

/**
 * Represents a function type that can accept all types of arguments and return any type.
 *
 * This is a generic function type definition for use cases where the input arguments and return type are not constrained.
 *
 * It is commonly used in situations where the specific function signature is unknown or can vary.
 */
export type AnyFn = (...args: any[]) => any;

export interface QueryReturn {
  groupId: string;
  txIds: string[];
  returns: ABIReturn[] & [];
  confirmations: PendingTransactionResponse[];
  transactions: Transaction[];
}

export type DeletedAsset = { id: bigint; deleted: true };

export type AssetMicro = (AssetMicroValue & { id: bigint }) | DeletedAsset;
export type AssetMicroLabels = (AssetMicroLabelsValue & { id: bigint }) | DeletedAsset;
export type AssetTiny = (AssetTinyValue & { id: bigint }) | DeletedAsset;
export type AssetTinyLabels = (AssetTinyLabelsValue & { id: bigint }) | DeletedAsset;
export type AssetText = (AssetTextValue & { id: bigint }) | DeletedAsset;
export type AssetTextLabels = (AssetTextLabelsValue & { id: bigint }) | DeletedAsset;
export type AssetSmall = (AssetSmallValue & { id: bigint }) | DeletedAsset;
export type AssetFull = (AssetFullValue & { id: bigint }) | DeletedAsset;

export type FirstArgument<T extends (...args: any[]) => any> = T extends (arg1: infer U, ...args: any[]) => any ? U : never;
