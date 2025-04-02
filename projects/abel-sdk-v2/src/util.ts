
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
