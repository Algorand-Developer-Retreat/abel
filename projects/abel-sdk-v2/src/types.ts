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
