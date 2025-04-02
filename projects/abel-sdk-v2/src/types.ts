import {
  LabelDescriptor as LabelDescriptorBoxValue,
} from "./generated/abel-contract-client.js";

export interface LabelDescriptor extends LabelDescriptorBoxValue {
  id: string;
}

export type AnyFn = (...args: any[]) => any;
