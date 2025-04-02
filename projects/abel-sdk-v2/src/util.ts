export async function wrapErrors<T>(a: T) {
  try {
    return await a;
  } catch (_e) {
    // TODO fallback for non-dev-mode nodes: iterate logs and find `ERR:`
    const e = _e as Error;
    let m: RegExpExecArray | null;
    if ((m = /"(ERR:[^"]+)"/.exec(e.message))) {
      // @ts-ignore remove?
      e.originalMessage = e.message;
      e.message = m[1];
    }
    throw e;
  }
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
