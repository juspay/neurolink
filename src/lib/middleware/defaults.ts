import type {
  MiddlewareConfig,
  MiddlewareFactoryOptions,
} from "../types/index.js";
import { logger } from "../utils/logger.js";
import { BUILT_IN_MIDDLEWARE_PRESET_NAMES } from "./presets.js";

/**
 * Middleware defaults.
 *
 * A generate()/stream() call resolves its middleware from up to four layers,
 * lowest precedence first:
 *
 *   1. NEUROLINK_MIDDLEWARE_PRESET        (process environment)
 *   2. configureGlobalMiddleware()        (module-level, set at runtime)
 *   3. new NeuroLink({ middleware })      (per instance)
 *   4. generate({ middleware })           (per call)
 *
 * A layer that is absent changes nothing, so a call made with no default set
 * keeps exactly the middleware it passed.
 */

export const MIDDLEWARE_PRESET_ENV_VAR = "NEUROLINK_MIDDLEWARE_PRESET";

let globalMiddleware: MiddlewareFactoryOptions | undefined;

const warnedPresets = new Set<string>();

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  !(value instanceof Date) &&
  !(value instanceof RegExp);

/** Own entries whose value is not `undefined`, so an unset key never wins. */
const definedEntries = <T extends object>(value: T | undefined): Partial<T> =>
  Object.fromEntries(
    Object.entries(value ?? {}).filter(([, entry]) => entry !== undefined),
  ) as Partial<T>;

const isPureData = (value: unknown): boolean => {
  if (value === null || typeof value !== "object") {
    return typeof value !== "function" && typeof value !== "symbol";
  }
  if (Array.isArray(value)) {
    return value.every(isPureData);
  }
  const proto = Object.getPrototypeOf(value);
  return (
    (proto === Object.prototype || proto === null) &&
    Object.values(value).every(isPureData)
  );
};

/**
 * Copy a value only when it is plain data (JSON-like, no functions or class
 * instances anywhere inside). A model handle, a callback or a custom
 * middleware keeps its identity, because copying one would split its state
 * from the object the caller still holds.
 */
const copyIfPureData = <T>(value: T): T =>
  isPureData(value) ? structuredClone(value) : value;

const isEmptyLayer = (layer: MiddlewareFactoryOptions): boolean =>
  Object.keys(definedEntries(layer)).length === 0;

const mergeConfigEntry = (
  base: MiddlewareConfig | undefined,
  override: MiddlewareConfig | undefined,
): MiddlewareConfig => {
  const merged: MiddlewareConfig = {
    ...definedEntries(base),
    ...definedEntries(override),
  };
  if (base?.config !== undefined || override?.config !== undefined) {
    merged.config = {
      ...definedEntries(base?.config),
      ...definedEntries(override?.config),
    };
  }
  return merged;
};

/** Middleware ids this layer switches on or off, by any of the three routes. */
const idsSwitched = (
  layer: MiddlewareFactoryOptions,
  state: boolean,
): Set<string> => {
  const ids = new Set<string>(
    (state ? layer.enabledMiddleware : layer.disabledMiddleware) ?? [],
  );
  for (const [id, entry] of Object.entries(layer.middlewareConfig ?? {})) {
    if (entry?.enabled === state) {
      ids.add(id);
    }
  }
  return ids;
};

/**
 * Layer `override` over `base`.
 *
 * - `preset`, `middleware`, `enabledMiddleware` and `disabledMiddleware`: the
 *   override's value replaces the base's whole; arrays are never concatenated.
 * - `middlewareConfig`: merged per middleware id. Within an id, `enabled` and
 *   `conditions` come from the override when it sets them, and `config` is
 *   merged key by key, so a key the override sets replaces the base's value
 *   for that key as a whole (nested objects and arrays are not combined).
 * - `global`: merged key by key.
 *
 * The factory applies `disabledMiddleware` after `enabledMiddleware`, so an id
 * the override switches on must be taken out of a disabled list it inherits
 * (and the reverse), or a lower layer's list would out-vote a call that asked
 * for the opposite.
 */
export function mergeMiddlewareOptions(
  base: MiddlewareFactoryOptions,
  override: MiddlewareFactoryOptions,
): MiddlewareFactoryOptions {
  const merged: MiddlewareFactoryOptions = {};

  const preset = override.preset ?? base.preset;
  if (preset !== undefined) {
    merged.preset = preset;
  }

  const custom = override.middleware ?? base.middleware;
  if (custom !== undefined) {
    merged.middleware = [...custom];
  }

  const switchedOn = idsSwitched(override, true);
  const switchedOff = idsSwitched(override, false);
  const enabled =
    override.enabledMiddleware ??
    base.enabledMiddleware?.filter((id) => !switchedOff.has(id));
  if (enabled !== undefined) {
    merged.enabledMiddleware = [...enabled];
  }
  const disabled =
    override.disabledMiddleware ??
    base.disabledMiddleware?.filter((id) => !switchedOn.has(id));
  if (disabled !== undefined) {
    merged.disabledMiddleware = [...disabled];
  }

  if (base.middlewareConfig || override.middlewareConfig) {
    const ids = new Set([
      ...Object.keys(base.middlewareConfig ?? {}),
      ...Object.keys(override.middlewareConfig ?? {}),
    ]);
    merged.middlewareConfig = Object.fromEntries(
      [...ids].map((id) => [
        id,
        mergeConfigEntry(
          base.middlewareConfig?.[id],
          override.middlewareConfig?.[id],
        ),
      ]),
    );
  }

  if (base.global || override.global) {
    merged.global = {
      ...definedEntries(base.global),
      ...definedEntries(override.global),
    };
  }

  return merged;
}

/**
 * Resolve the options a call runs with. `defaults` is ordered lowest
 * precedence first; the per-call options sit on top.
 *
 * With no default present this returns `call` itself, so callers that never
 * opted in see no change at all.
 */
export function resolveMiddlewareOptions(
  defaults: ReadonlyArray<MiddlewareFactoryOptions | undefined>,
  call: MiddlewareFactoryOptions | undefined,
): MiddlewareFactoryOptions | undefined {
  const layers = defaults.filter(
    (layer): layer is MiddlewareFactoryOptions =>
      layer !== undefined && !isEmptyLayer(layer),
  );
  if (layers.length === 0) {
    return call;
  }
  const inherited = layers.reduce<MiddlewareFactoryOptions>(
    (acc, layer) => mergeMiddlewareOptions(acc, layer),
    {},
  );
  return isPlainObject(call)
    ? mergeMiddlewareOptions(inherited, call)
    : inherited;
}

/**
 * Validate a default layer and copy it, so later edits to the caller's object
 * cannot change a default that was already set. Plain data (a word list, a
 * replacement string) is copied in full; custom middleware, callbacks and
 * model handles keep their identity. Throws a TypeError for a value that is
 * not an object and for a preset name that is not built in.
 */
export function snapshotMiddlewareOptions(
  options: MiddlewareFactoryOptions,
  source: string,
): MiddlewareFactoryOptions {
  if (!isPlainObject(options)) {
    throw new TypeError(
      `${source}: middleware must be an object of MiddlewareFactoryOptions`,
    );
  }
  if (
    options.preset !== undefined &&
    !BUILT_IN_MIDDLEWARE_PRESET_NAMES.includes(options.preset)
  ) {
    // An unknown name left in the layer would replace a valid lower-layer
    // preset and leave guardrails off with no sign of it, so a typo fails here.
    throw new TypeError(
      `${source}: unknown middleware preset ${JSON.stringify(options.preset)}. Known presets: ${BUILT_IN_MIDDLEWARE_PRESET_NAMES.join(", ")}.`,
    );
  }
  const merged = mergeMiddlewareOptions({}, options);
  return {
    ...merged,
    ...(merged.middlewareConfig
      ? {
          middlewareConfig: Object.fromEntries(
            Object.entries(merged.middlewareConfig).map(([id, entry]) => [
              id,
              {
                ...entry,
                ...(entry.config
                  ? {
                      config: Object.fromEntries(
                        Object.entries(entry.config).map(([key, value]) => [
                          key,
                          copyIfPureData(value),
                        ]),
                      ),
                    }
                  : {}),
                ...(entry.conditions
                  ? { conditions: copyIfPureData(entry.conditions) }
                  : {}),
              },
            ]),
          ),
        }
      : {}),
  };
}

/**
 * Process-wide middleware defaults. Applies to every NeuroLink instance, below
 * the instance's own `middleware` option and above NEUROLINK_MIDDLEWARE_PRESET.
 * Replaces any earlier call rather than adding to it, and is read on each
 * generate()/stream(), so instances that already exist pick it up. Throws a
 * TypeError when `options` is not an object or names a preset that is not
 * built in.
 */
export function configureGlobalMiddleware(
  options: MiddlewareFactoryOptions,
): void {
  globalMiddleware = snapshotMiddlewareOptions(
    options,
    "configureGlobalMiddleware",
  );
}

/** Remove the defaults set by {@link configureGlobalMiddleware}. */
export function clearGlobalMiddleware(): void {
  globalMiddleware = undefined;
}

/** The current global defaults, or undefined when none are set. */
export function getGlobalMiddleware(): MiddlewareFactoryOptions | undefined {
  return globalMiddleware;
}

/**
 * The preset named by NEUROLINK_MIDDLEWARE_PRESET, as the lowest default layer.
 * An unset or blank variable is no layer; an unrecognised name is reported
 * on stderr once per distinct value and ignored.
 */
export function readEnvMiddlewarePreset(
  env: NodeJS.ProcessEnv = process.env,
): MiddlewareFactoryOptions | undefined {
  const raw = env[MIDDLEWARE_PRESET_ENV_VAR]?.trim();
  if (!raw) {
    return undefined;
  }
  if (BUILT_IN_MIDDLEWARE_PRESET_NAMES.includes(raw)) {
    return { preset: raw };
  }
  if (!warnedPresets.has(raw)) {
    warnedPresets.add(raw);
    // Written to stderr rather than through logger.warn, which drops warnings
    // unless debugging: a mistyped preset would otherwise leave guardrails off
    // with no sign of it.
    logger.alwaysStderr(
      `[Middleware] Ignoring ${MIDDLEWARE_PRESET_ENV_VAR}=${JSON.stringify(raw)}: not a known preset. Known presets: ${BUILT_IN_MIDDLEWARE_PRESET_NAMES.join(", ")}.`,
    );
  }
  return undefined;
}
