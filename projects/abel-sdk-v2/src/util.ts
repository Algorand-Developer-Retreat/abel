import { encodeUint64 } from "algosdk";

interface ErrorWithResponse extends Error {
  response?: {
    body?: {
      data?: {
        "eval-states": undefined | Array<{
          logs?: string[]
        }>
      }
    }
  }
}

export async function wrapErrors<T>(a: T) {
  try {
    return await a;
  } catch (_e) {
    const e = _e as ErrorWithResponse;
    // try to find ERR in a last log position and throw it
    if (e.response?.body?.data?.['eval-states']) {
      for(const { logs } of e.response?.body?.data?.['eval-states']) {
        if (logs?.length) {
          const lastLog = logs[logs.length - 1];
          const decoded = Buffer.from(lastLog, 'base64').toString()
          if (decoded.startsWith('ERR')) {
            throw new Error(decoded);
          }
        }
      }
    }
    throw e;
  }
}

export function encodeUint64Arr(nums: number[] | bigint[]): Uint8Array[] {
  return nums.map(num => encodeUint64(num))
}

export function chunk<T>(array: T[], chunkSize: number): T[][] {
  if (chunkSize <= 0) {
    throw new Error("Chunk size must be greater than 0");
  }

  const result: T[][] = [];

  for (let i = 0; i < array.length; i += chunkSize) {
    result.push(array.slice(i, i + chunkSize));
  }

  return result;
}

export function mergeMapsArr<K, V>(maps: Map<K, V>[]): Map<K, V> {
  const mergedMap = new Map<K, V>(maps[0]);

  for (const map of maps.slice(1)) {
    map.forEach((value, key) => {
      mergedMap.set(key, value); // Overwrites or adds new key-value pairs
    });
  }

  return mergedMap;
}

export function isNullish(str: string) {
  return str === undefined || str === null
}
