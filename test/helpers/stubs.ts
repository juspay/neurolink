/**
 * Test doubles for the continuous (tsx) suites.
 *
 * The continuous suites are plain scripts — there is no runner injecting a
 * mocking API, so every stub has to install and restore itself. The suites
 * already do this by hand (`const original = x.y; …; x.y = original`), which is
 * correct but easy to get wrong: an assertion that throws between the two skips
 * the restore and silently corrupts every later test in the file.
 *
 * These helpers keep the same explicit style while making restoration
 * unconditional.
 */

/** A stub installed on an object property, restorable exactly once. */
export type Stub<TArgs extends unknown[] = unknown[], TReturn = unknown> = {
  /** Arguments of every call, in order. */
  readonly calls: TArgs[];
  /** Number of times the stub was invoked. */
  readonly callCount: number;
  /** Put the original value back. Safe to call more than once. */
  restore: () => void;
  /** The installed replacement, for direct invocation in assertions. */
  readonly fn: (...args: TArgs) => TReturn;
};

/**
 * Replace `obj[key]` with `impl`, recording calls.
 *
 * Prefer `withStubs()` over calling `restore()` by hand — a throwing assertion
 * between install and restore is exactly the case this exists to survive.
 */
export function stub<
  TObj extends object,
  TKey extends keyof TObj,
  TArgs extends unknown[],
  TReturn,
>(
  obj: TObj,
  key: TKey,
  impl: (...args: TArgs) => TReturn,
): Stub<TArgs, TReturn> {
  const original = obj[key];
  const hadOwn = Object.prototype.hasOwnProperty.call(obj, key);
  const calls: TArgs[] = [];
  let restored = false;

  const fn = (...args: TArgs): TReturn => {
    calls.push(args);
    return impl(...args);
  };

  (obj as Record<PropertyKey, unknown>)[key as PropertyKey] = fn;

  return {
    calls,
    get callCount() {
      return calls.length;
    },
    fn,
    restore: () => {
      if (restored) {
        return;
      }
      restored = true;
      // Deleting matters for inherited members: assigning the prototype's value
      // back would leave a own-property shadow that outlives the test.
      if (hadOwn) {
        (obj as Record<PropertyKey, unknown>)[key as PropertyKey] = original;
      } else {
        delete (obj as Record<PropertyKey, unknown>)[key as PropertyKey];
      }
    },
  };
}

/**
 * Record calls to `obj[key]` while keeping the real implementation.
 *
 * The distinction from `stub()` matters and is easy to get wrong: replacing a
 * method with a no-op silently disables the behaviour under test. Observing a
 * cache's write method, for instance, must still populate the cache — otherwise
 * a later "served from cache" assertion fails for a reason that has nothing to
 * do with the code being tested.
 */
export function observe<TObj extends object, TKey extends keyof TObj>(
  obj: TObj,
  key: TKey,
): Stub<unknown[], unknown> {
  const original = obj[key];
  if (typeof original !== "function") {
    throw new TypeError(
      `Cannot observe non-function property "${String(key)}"`,
    );
  }
  const realFn = original as unknown as (...args: unknown[]) => unknown;
  return stub(obj, key, (...args: unknown[]) => realFn.apply(obj, args));
}

/** A standalone recording function, for callbacks passed as arguments. */
export function spy<TArgs extends unknown[], TReturn>(
  impl: (...args: TArgs) => TReturn = (() => undefined) as never,
): Stub<TArgs, TReturn> {
  const calls: TArgs[] = [];
  const fn = (...args: TArgs): TReturn => {
    calls.push(args);
    return impl(...args);
  };
  return {
    calls,
    get callCount() {
      return calls.length;
    },
    fn,
    restore: () => {},
  };
}

/**
 * Run `body` with `stubs` installed, restoring them in reverse order whether it
 * returns or throws.
 */
export async function withStubs<T>(
  stubs: Array<{ restore: () => void }>,
  body: () => Promise<T> | T,
): Promise<T> {
  try {
    return await body();
  } finally {
    for (const s of [...stubs].reverse()) {
      s.restore();
    }
  }
}
