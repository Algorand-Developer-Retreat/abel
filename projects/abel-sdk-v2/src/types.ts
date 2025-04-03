import { ABIReturn } from "@algorandfoundation/algokit-utils/types/app";
import { Transaction } from "algosdk";
import { PendingTransactionResponse } from "algosdk/dist/types/client/v2/algod/models/types.js";
import { LabelDescriptor as LabelDescriptorBoxValue, AssetMicro as AssetMicroValue } from "./generated/abel-contract-client.js";

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

export interface AssetMicro extends AssetMicroValue {
  id: bigint;
}

export type FirstArgument<T extends (...args: any[]) => any> = T extends (arg1: infer U, ...args: any[]) => any ? U : never;
