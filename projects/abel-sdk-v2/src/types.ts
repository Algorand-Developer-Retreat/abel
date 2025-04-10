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
 * A label description/configuration
 *
 */
export interface LabelDescriptor extends LabelDescriptorBoxValue {
  id: string;
}

export type AnyFn = (...args: any[]) => any;

export interface QueryReturn {
  groupId: string;
  txIds: string[];
  returns: ABIReturn[] & [];
  confirmations: PendingTransactionResponse[];
  transactions: Transaction[];
}

export interface AssetMicro extends AssetMicroValue { id: bigint; }
export interface AssetMicroLabels extends AssetMicroLabelsValue { id: bigint; }
export interface AssetTiny extends AssetTinyValue { id: bigint; }
export interface AssetTinyLabels extends AssetTinyLabelsValue { id: bigint; }
export interface AssetText extends AssetTextValue { id: bigint; }
export interface AssetTextLabels extends AssetTextLabelsValue { id: bigint; }
export interface AssetSmall extends AssetSmallValue { id: bigint; }
export interface AssetFull extends AssetFullValue { id: bigint; }

export type FirstArgument<T extends (...args: any[]) => any> = T extends (arg1: infer U, ...args: any[]) => any ? U : never;
