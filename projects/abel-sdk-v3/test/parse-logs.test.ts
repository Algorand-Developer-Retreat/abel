import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { AssetMicroLabelsFromTuple, AssetMicroFromTuple } from "../src/generated/abel-contract-client.js";
import { makeOfflineSdk, asOffsetView } from "./helpers.js";

const abel = makeOfflineSdk();

/** Encode a value using the contract's own declared return type for `methodName`. */
function encodeReturn(methodName: string, value: unknown): Uint8Array {
  const method = abel.readClient.appClient.getABIMethod(methodName);
  // @ts-ignore - returns.type is ABIType for every non-void method used here
  return method.returns.type.encode(value);
}

describe("parseLogsAs", () => {
  describe("algosdk 3.x byteOffset regression", () => {
    // Regression guard for the fix in a0f275d. algosdk 3.x ABITupleType.decode reads
    // dynamic-field head offsets via `new DataView(bytes.buffer).getUint16(i)`, which
    // ignores the Uint8Array's byteOffset. Simulate logs are subarray views with a
    // non-zero byteOffset, so decoding read from the wrong position and threw
    // "dynamic index segment miscalculation". parseLogsAs must copy to a fresh
    // 0-offset buffer first.
    //
    // AssetMicroLabels is the important case: it has two dynamic fields (string and
    // string[]), so it exercises the head-offset path that actually broke.

    it("decodes a log that is a non-zero-offset view", () => {
      const encoded = encodeReturn("get_asset_micro_labels", ["USDt", 6, ["pv"]]);
      const log = asOffsetView(encoded);

      const [parsed] = abel.parseLogsAs([log], AssetMicroLabelsFromTuple, "get_asset_micro_labels");

      assert.equal(parsed.unitName, "USDt");
      assert.equal(parsed.decimals, 6);
      assert.deepEqual(parsed.labels, ["pv"]);
    });

    it("decodes offset and zero-offset views identically", () => {
      const encoded = encodeReturn("get_asset_micro_labels", ["MCAU", 5, ["pv", "13"]]);

      const [fromZeroOffset] = abel.parseLogsAs([encoded], AssetMicroLabelsFromTuple, "get_asset_micro_labels");
      const [fromOffset] = abel.parseLogsAs([asOffsetView(encoded)], AssetMicroLabelsFromTuple, "get_asset_micro_labels");

      assert.deepEqual(fromOffset, fromZeroOffset);
    });

    it("decodes correctly at several different byte offsets", () => {
      const encoded = encodeReturn("get_asset_micro_labels", ["MCAG", 5, ["pv"]]);

      for (const offset of [1, 2, 3, 8, 15, 64]) {
        const [parsed] = abel.parseLogsAs(
          [asOffsetView(encoded, offset)],
          AssetMicroLabelsFromTuple,
          "get_asset_micro_labels",
        );
        assert.equal(parsed.unitName, "MCAG", `wrong decode at byteOffset ${offset}`);
        assert.deepEqual(parsed.labels, ["pv"], `wrong decode at byteOffset ${offset}`);
      }
    });

    it("decodes a batch of offset logs, preserving order", () => {
      const assets: Array<[string, number, string[]]> = [
        ["USDt", 6, ["pv"]],
        ["MCAU", 5, ["pv"]],
        ["Planets", 6, []],
      ];
      const logs = assets.map((a) => asOffsetView(encodeReturn("get_asset_micro_labels", a)));

      const parsed = abel.parseLogsAs(logs, AssetMicroLabelsFromTuple, "get_asset_micro_labels");

      assert.equal(parsed.length, 3);
      assert.deepEqual(
        parsed.map((p) => p.unitName),
        ["USDt", "MCAU", "Planets"],
      );
      assert.deepEqual(parsed[2].labels, []);
    });
  });

  describe("decimals coercion", () => {
    // The AVM returns uint8 decimals, which algosdk surfaces as bigint even though the
    // generated struct types it as number. parseLogsAs patches this; without it,
    // consumers get `6n` where the type promises `6`.
    it("returns decimals as a number, not a bigint", () => {
      const encoded = encodeReturn("get_asset_micro", ["USDt", 6]);

      const [parsed] = abel.parseLogsAs([asOffsetView(encoded)], AssetMicroFromTuple, "get_asset_micro");

      assert.equal(typeof parsed.decimals, "number");
      assert.equal(parsed.decimals, 6);
      assert.notEqual(typeof parsed.decimals, "bigint");
    });

    it("coerces decimals of 0 without dropping the field", () => {
      const encoded = encodeReturn("get_asset_micro", ["NODEC", 0]);

      const [parsed] = abel.parseLogsAs([asOffsetView(encoded)], AssetMicroFromTuple, "get_asset_micro");

      assert.equal(parsed.decimals, 0);
      assert.equal(typeof parsed.decimals, "number");
    });
  });

  describe("empty logs", () => {
    // A zero-length log means the asset was deleted; the contract logs nothing for it.
    it("maps an empty log to a deleted marker", () => {
      const parsed = abel.parseLogsAs([new Uint8Array(0)], AssetMicroFromTuple, "get_asset_micro");

      assert.deepEqual(parsed, [{ deleted: true }]);
    });

    it("keeps deleted markers positionally aligned with real assets", () => {
      const logs = [
        asOffsetView(encodeReturn("get_asset_micro", ["USDt", 6])),
        new Uint8Array(0),
        asOffsetView(encodeReturn("get_asset_micro", ["MCAU", 5])),
      ];

      const parsed = abel.parseLogsAs(logs, AssetMicroFromTuple, "get_asset_micro");

      assert.equal(parsed.length, 3);
      assert.equal(parsed[0].unitName, "USDt");
      assert.deepEqual(parsed[1], { deleted: true });
      assert.equal(parsed[2].unitName, "MCAU");
    });

    it("returns an empty array for no logs", () => {
      assert.deepEqual(abel.parseLogsAs([], AssetMicroFromTuple, "get_asset_micro"), []);
    });
  });
});
