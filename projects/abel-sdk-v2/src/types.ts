import {
  LabelDescriptor as LabelDescriptorBoxValue,
} from "./generated/abel-contract-client.js";
import {ABIReturn} from "@algorandfoundation/algokit-utils/types/app";
import {PendingTransactionResponse} from "algosdk/dist/types/client/v2/algod/models/types.js";
import {Transaction} from "algosdk";

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
