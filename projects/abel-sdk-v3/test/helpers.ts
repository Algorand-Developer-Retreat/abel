import { AlgorandClient } from "@algorandfoundation/algokit-utils";
import { AbelSDK } from "../src/index.js";

/**
 * An SDK instance suitable for offline unit tests.
 *
 * The constructor only builds typed app clients from the bundled app spec, so no
 * network traffic happens here. The algod config below is never contacted.
 */
export function makeOfflineSdk(): AbelSDK {
  return new AbelSDK({
    appId: 2914159523n,
    algorand: AlgorandClient.fromConfig({
      algodConfig: { server: "http://localhost", port: 4001, token: "a".repeat(64) },
    }),
  });
}

/**
 * Re-create the shape of a log as it arrives from a simulate response: a subarray
 * view into a larger buffer, with a non-zero byteOffset.
 */
export function asOffsetView(bytes: Uint8Array, offset = 7): Uint8Array {
  const backing = new Uint8Array(bytes.length + offset * 2);
  backing.fill(0xff);
  backing.set(bytes, offset);
  const view = backing.subarray(offset, offset + bytes.length);
  if (view.byteOffset === 0) {
    throw new Error("test setup failed: expected a non-zero byteOffset view");
  }
  return view;
}
