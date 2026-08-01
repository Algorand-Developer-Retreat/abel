import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { decodeUint64 } from "algosdk";

import { chunk, mergeMapsArr, encodeUint64Arr, isNullish } from "../src/util.js";

/**
 * The per-view maxima the SDK batches at, mirroring the resource limits documented in
 * the root README. These are the boundaries chunk() is used at in practice.
 */
const VIEW_MAXIMA = {
  micro: 128,
  tiny: 128,
  text: 128,
  microLabels: 64,
  tinyLabels: 64,
  textLabels: 64,
  small: 64,
  full: 42,
} as const;

describe("chunk", () => {
  it("returns a single chunk when the input is under the limit", () => {
    assert.deepEqual(chunk([1, 2, 3], 128), [[1, 2, 3]]);
  });

  it("returns a single chunk when the input is exactly the limit", () => {
    const ids = Array.from({ length: 128 }, (_, i) => i);
    const chunks = chunk(ids, 128);

    assert.equal(chunks.length, 1);
    assert.equal(chunks[0].length, 128);
  });

  it("splits into two chunks one past the limit", () => {
    const ids = Array.from({ length: 129 }, (_, i) => i);
    const chunks = chunk(ids, 128);

    assert.equal(chunks.length, 2);
    assert.equal(chunks[0].length, 128);
    assert.equal(chunks[1].length, 1);
  });

  it("chunks correctly at every view's maximum", () => {
    for (const [view, max] of Object.entries(VIEW_MAXIMA)) {
      // Two full batches plus a partial one.
      const ids = Array.from({ length: max * 2 + 3 }, (_, i) => i);
      const chunks = chunk(ids, max);

      assert.equal(chunks.length, 3, `${view}: wrong chunk count`);
      assert.equal(chunks[0].length, max, `${view}: first chunk not full`);
      assert.equal(chunks[1].length, max, `${view}: second chunk not full`);
      assert.equal(chunks[2].length, 3, `${view}: wrong remainder`);
    }
  });

  it("preserves order and loses no elements", () => {
    const ids = Array.from({ length: 300 }, (_, i) => BigInt(i));
    const flattened = chunk(ids, 42).flat();

    assert.deepEqual(flattened, ids);
  });

  it("returns no chunks for an empty input", () => {
    assert.deepEqual(chunk([], 128), []);
  });

  it("rejects a non-positive chunk size", () => {
    assert.throws(() => chunk([1, 2, 3], 0), /Chunk size must be greater than 0/);
    assert.throws(() => chunk([1, 2, 3], -1), /Chunk size must be greater than 0/);
  });
});

describe("mergeMapsArr", () => {
  // batchCall merges the per-chunk result maps back into one; if this dropped or
  // reordered entries, large lookups would silently return partial data.
  it("merges chunked results into one map", () => {
    const merged = mergeMapsArr([
      new Map([[1n, "a"]]),
      new Map([[2n, "b"]]),
      new Map([[3n, "c"]]),
    ]);

    assert.equal(merged.size, 3);
    assert.deepEqual([...merged.entries()], [
      [1n, "a"],
      [2n, "b"],
      [3n, "c"],
    ]);
  });

  it("preserves every entry across many chunks", () => {
    const ids = Array.from({ length: 300 }, (_, i) => BigInt(i));
    const maps = chunk(ids, 42).map((c) => new Map(c.map((id) => [id, `asset-${id}`])));

    const merged = mergeMapsArr(maps);

    assert.equal(merged.size, 300);
    assert.equal(merged.get(0n), "asset-0");
    assert.equal(merged.get(299n), "asset-299");
  });

  it("returns an empty map for no input", () => {
    assert.equal(mergeMapsArr([]).size, 0);
  });

  it("does not mutate the first input map", () => {
    const first = new Map([[1n, "a"]]);
    mergeMapsArr([first, new Map([[2n, "b"]])]);

    assert.equal(first.size, 1);
  });
});

describe("encodeUint64Arr", () => {
  it("round-trips asset IDs", () => {
    const ids = [0n, 1n, 312769n, 2914159523n];

    const roundTripped = encodeUint64Arr(ids).map((b) => decodeUint64(b, "bigint"));

    assert.deepEqual(roundTripped, ids);
  });

  it("encodes each ID as 8 bytes", () => {
    for (const encoded of encodeUint64Arr([0n, 312769n])) {
      assert.equal(encoded.length, 8);
    }
  });

  it("returns an empty array for no IDs", () => {
    assert.deepEqual(encodeUint64Arr([]), []);
  });
});

describe("isNullish", () => {
  it("is true for undefined and null", () => {
    assert.equal(isNullish(undefined as unknown as string), true);
    assert.equal(isNullish(null as unknown as string), true);
  });

  it("is false for an empty string", () => {
    assert.equal(isNullish(""), false);
  });
});
