import {
  LabelDescriptor as LabelDescriptorBoxValue,
  AssetMicro as AssetMicroValue,
} from "./generated/abel-contract-client.js";

export interface LabelDescriptor extends LabelDescriptorBoxValue {
  id: string;
}

export type AnyFn = (...args: any[]) => any;

export interface AssetMicro extends AssetMicroValue {
  id: bigint;
}

export type FirstArgument<T extends (...args: any[]) => any> = T extends (arg1: infer U, ...args: any[]) => any ? U : never;
