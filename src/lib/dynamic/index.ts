/**
 * Dynamic Arguments Module
 *
 * Resolves function-valued options to their actual values before
 * provider dispatch. All type definitions live in `src/lib/types/dynamic.ts`.
 *
 * @module dynamic
 */

// Type guards
export { isDynamicFunction, isContextAwareFunction } from "./resolution.js";

// Resolution utilities
export {
  resolveDynamicArgument,
  resolveDynamicArguments,
  resolveDynamicConfig,
  memoizeDynamicArgument,
  withFallback,
  conditional,
  mapDynamicArgument,
  combineDynamicArguments,
  hasDynamicArgument,
  hasDynamicProperties,
  clearResolutionCache,
  getResolutionCacheStats,
  destroyResolver,
  resolutionCache,
  interpolateEnvVars,
  fromEnv,
  envVar,
  envSwitch,
  envJson,
  envNumber,
  envBoolean,
  envList,
} from "./dynamicResolver.js";
