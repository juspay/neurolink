/**
 * Environment Resolver
 *
 * Utilities for resolving configuration from environment variables.
 * Provides type-safe access with validation, defaults, and transformations.
 *
 * @module arguments/resolvers/environment
 * @version 1.0.0
 */

import type {
  DynamicArgument,
  RuntimeValueDescriptor,
} from "../types/argumentTypes.js";

// ============================================================================
// Environment Access Functions
// ============================================================================

/**
 * Get an environment variable with optional default.
 */
export function getEnv(key: string, defaultValue?: string): string | undefined {
  return process.env[key] ?? defaultValue;
}

/**
 * Get a required environment variable.
 * Throws if not found.
 */
export function requireEnv(key: string): string {
  const value = process.env[key];
  if (value === undefined) {
    throw new Error(`Required environment variable '${key}' is not set`);
  }
  return value;
}

/**
 * Get an environment variable as a number.
 */
export function getEnvNumber(
  key: string,
  defaultValue?: number,
): number | undefined {
  const value = process.env[key];
  if (value === undefined) {
    return defaultValue;
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error(
      `Environment variable '${key}' is not a valid number: ${value}`,
    );
  }
  return parsed;
}

/**
 * Get an environment variable as a boolean.
 * Recognizes: true/false, 1/0, yes/no, on/off
 */
export function getEnvBoolean(
  key: string,
  defaultValue?: boolean,
): boolean | undefined {
  const value = process.env[key];
  if (value === undefined) {
    return defaultValue;
  }

  const lower = value.toLowerCase();

  if (["true", "1", "yes", "on"].includes(lower)) {
    return true;
  }
  if (["false", "0", "no", "off"].includes(lower)) {
    return false;
  }

  throw new Error(
    `Environment variable '${key}' is not a valid boolean: ${value}`,
  );
}

/**
 * Get an environment variable as a JSON-parsed value.
 */
export function getEnvJson<T>(key: string, defaultValue?: T): T | undefined {
  const value = process.env[key];
  if (value === undefined) {
    return defaultValue;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(
      `Environment variable '${key}' is not valid JSON: ${value}`,
    );
  }
}

/**
 * Get an environment variable as an array (comma-separated).
 */
export function getEnvArray(
  key: string,
  defaultValue?: string[],
  separator: string = ",",
): string[] | undefined {
  const value = process.env[key];
  if (value === undefined) {
    return defaultValue;
  }

  return value
    .split(separator)
    .map((item) => item.trim())
    .filter(Boolean);
}

// ============================================================================
// Dynamic Argument Factories
// ============================================================================

/**
 * Create a dynamic argument that resolves from an environment variable.
 *
 * @example
 * ```typescript
 * const modelArg = fromEnv("DEFAULT_MODEL", "gpt-4o");
 * const result = await resolveDynamicArgument(modelArg);
 * // Returns process.env.DEFAULT_MODEL or "gpt-4o"
 * ```
 */
export function fromEnv(
  key: string,
  defaultValue?: string,
): DynamicArgument<string> {
  return (): string => {
    return process.env[key] ?? defaultValue ?? "";
  };
}

/**
 * Create a dynamic argument from a required environment variable.
 */
export function fromEnvRequired(key: string): DynamicArgument<string> {
  return (): string => {
    return requireEnv(key);
  };
}

/**
 * Create a dynamic argument from an environment variable parsed as number.
 */
export function fromEnvNumber(
  key: string,
  defaultValue?: number,
): DynamicArgument<number> {
  return (): number => {
    const value = getEnvNumber(key, defaultValue);
    if (value === undefined) {
      throw new Error(`Environment variable '${key}' is not set`);
    }
    return value;
  };
}

/**
 * Create a dynamic argument from an environment variable parsed as boolean.
 */
export function fromEnvBoolean(
  key: string,
  defaultValue?: boolean,
): DynamicArgument<boolean> {
  return (): boolean => {
    const value = getEnvBoolean(key, defaultValue);
    if (value === undefined) {
      throw new Error(`Environment variable '${key}' is not set`);
    }
    return value;
  };
}

/**
 * Create a dynamic argument from an environment variable parsed as JSON.
 */
export function fromEnvJson<T>(
  key: string,
  defaultValue?: T,
): DynamicArgument<T> {
  return (): T => {
    const value = getEnvJson<T>(key, defaultValue);
    if (value === undefined) {
      throw new Error(`Environment variable '${key}' is not set`);
    }
    return value;
  };
}

/**
 * Create a dynamic argument from an environment variable parsed as array.
 */
export function fromEnvArray(
  key: string,
  defaultValue?: string[],
  separator?: string,
): DynamicArgument<string[]> {
  return (): string[] => {
    const value = getEnvArray(key, defaultValue, separator);
    if (value === undefined) {
      throw new Error(`Environment variable '${key}' is not set`);
    }
    return value;
  };
}

// ============================================================================
// Environment-Based Selection
// ============================================================================

/**
 * Select a value based on NODE_ENV.
 *
 * @example
 * ```typescript
 * const model = envSelect({
 *   development: "gpt-4o-mini",
 *   test: "gpt-4o-mini",
 *   production: "claude-3-opus",
 * });
 * ```
 */
export function envSelect<T>(options: {
  development?: T;
  test?: T;
  production?: T;
  default?: T;
}): DynamicArgument<T> {
  return (): T => {
    const env = process.env.NODE_ENV || "development";

    const value = options[env as keyof typeof options] ?? options.default;

    if (value === undefined) {
      throw new Error(`No value configured for environment: ${env}`);
    }

    return value;
  };
}

/**
 * Create a dynamic argument that varies by environment.
 */
export function byEnvironment<T>(
  mapping: Record<string, T>,
  defaultValue?: T,
): DynamicArgument<T> {
  return (): T => {
    const env = process.env.NODE_ENV || "development";
    const value = mapping[env] ?? defaultValue;

    if (value === undefined) {
      throw new Error(`No mapping for environment: ${env}`);
    }

    return value;
  };
}

// ============================================================================
// Environment Configuration Objects
// ============================================================================

/**
 * Configuration for environment-based resolution
 */
export type EnvConfigOptions<T> = {
  /** Environment variable key */
  key: string;

  /** Default value if not set */
  defaultValue?: T;

  /** Whether the variable is required */
  required?: boolean;

  /** Transform function for the value */
  transform?: (value: string) => T;

  /** Validation function */
  validate?: (value: T) => boolean;

  /** Error message for validation failure */
  validationError?: string;
};

/**
 * Create a fully configured environment resolver.
 */
export function createEnvResolver<T>(
  options: EnvConfigOptions<T>,
): DynamicArgument<T> {
  return (): T => {
    const {
      key,
      defaultValue,
      required,
      transform,
      validate,
      validationError,
    } = options;

    const rawValue = process.env[key];

    // Handle missing value
    if (rawValue === undefined) {
      if (required) {
        throw new Error(`Required environment variable '${key}' is not set`);
      }
      if (defaultValue === undefined) {
        throw new Error(
          `Environment variable '${key}' is not set and no default provided`,
        );
      }
      return defaultValue;
    }

    // Transform the value
    let value: T;
    if (transform) {
      try {
        value = transform(rawValue);
      } catch (error) {
        throw new Error(
          `Failed to transform environment variable '${key}': ${error instanceof Error ? error.message : error}`,
        );
      }
    } else {
      value = rawValue as unknown as T;
    }

    // Validate the value
    if (validate && !validate(value)) {
      throw new Error(
        validationError ||
          `Environment variable '${key}' failed validation: ${rawValue}`,
      );
    }

    return value;
  };
}

// ============================================================================
// Environment Prefix Resolver
// ============================================================================

/**
 * Create a resolver for environment variables with a prefix.
 *
 * @example
 * ```typescript
 * const neurolink = createPrefixedEnv("NEUROLINK");
 *
 * const model = neurolink.get("MODEL"); // NEUROLINK_MODEL
 * const timeout = neurolink.getNumber("TIMEOUT", 30000); // NEUROLINK_TIMEOUT
 * ```
 */
export function createPrefixedEnv(prefix: string) {
  const prefixed = (key: string) => `${prefix}_${key}`;

  return {
    /**
     * Get a string value
     */
    get(key: string, defaultValue?: string): DynamicArgument<string> {
      return fromEnv(prefixed(key), defaultValue);
    },

    /**
     * Get a required string value
     */
    getRequired(key: string): DynamicArgument<string> {
      return fromEnvRequired(prefixed(key));
    },

    /**
     * Get a number value
     */
    getNumber(key: string, defaultValue?: number): DynamicArgument<number> {
      return fromEnvNumber(prefixed(key), defaultValue);
    },

    /**
     * Get a boolean value
     */
    getBoolean(key: string, defaultValue?: boolean): DynamicArgument<boolean> {
      return fromEnvBoolean(prefixed(key), defaultValue);
    },

    /**
     * Get a JSON value
     */
    getJson<T>(key: string, defaultValue?: T): DynamicArgument<T> {
      return fromEnvJson<T>(prefixed(key), defaultValue);
    },

    /**
     * Get an array value
     */
    getArray(
      key: string,
      defaultValue?: string[],
      separator?: string,
    ): DynamicArgument<string[]> {
      return fromEnvArray(prefixed(key), defaultValue, separator);
    },

    /**
     * Check if a key exists
     */
    has(key: string): boolean {
      return process.env[prefixed(key)] !== undefined;
    },

    /**
     * Get all environment variables with this prefix
     */
    getAll(): Record<string, string> {
      const result: Record<string, string> = {};
      const prefixWithUnderscore = `${prefix}_`;

      for (const [key, value] of Object.entries(process.env)) {
        if (key.startsWith(prefixWithUnderscore) && value !== undefined) {
          const shortKey = key.slice(prefixWithUnderscore.length);
          result[shortKey] = value;
        }
      }

      return result;
    },
  };
}

// ============================================================================
// Multi-Source Configuration
// ============================================================================

/**
 * Create a resolver that checks multiple environment variables.
 * Returns the first one that is set.
 *
 * @example
 * ```typescript
 * const model = fromEnvMultiple(
 *   ["AI_MODEL", "OPENAI_MODEL", "DEFAULT_MODEL"],
 *   "gpt-4o"
 * );
 * ```
 */
export function fromEnvMultiple(
  keys: string[],
  defaultValue?: string,
): DynamicArgument<string> {
  return (): string => {
    for (const key of keys) {
      const value = process.env[key];
      if (value !== undefined) {
        return value;
      }
    }

    if (defaultValue === undefined) {
      throw new Error(
        `None of the environment variables are set: ${keys.join(", ")}`,
      );
    }

    return defaultValue;
  };
}

/**
 * Create a resolver from a RuntimeValueDescriptor.
 */
export function fromDescriptor(
  descriptor: RuntimeValueDescriptor,
): DynamicArgument<unknown> {
  return (): unknown => {
    if (descriptor.source !== "env") {
      throw new Error(
        `EnvironmentResolver only supports 'env' source, got: ${descriptor.source}`,
      );
    }

    const rawValue = process.env[descriptor.key];

    if (rawValue === undefined) {
      if (descriptor.required) {
        throw new Error(
          `Required environment variable '${descriptor.key}' is not set`,
        );
      }
      return descriptor.defaultValue;
    }

    if (descriptor.transform) {
      return descriptor.transform(rawValue);
    }

    return rawValue;
  };
}

// ============================================================================
// Environment Validation
// ============================================================================

/**
 * Validate that required environment variables are set.
 */
export function validateEnvVars(
  required: string[],
  optional?: string[],
): { valid: boolean; missing: string[]; warnings: string[] } {
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const key of required) {
    if (process.env[key] === undefined) {
      missing.push(key);
    }
  }

  if (optional) {
    for (const key of optional) {
      if (process.env[key] === undefined) {
        warnings.push(`Optional environment variable '${key}' is not set`);
      }
    }
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
  };
}

/**
 * Assert that required environment variables are set.
 * Throws if any are missing.
 */
export function assertEnvVars(required: string[]): void {
  const result = validateEnvVars(required);
  if (!result.valid) {
    throw new Error(
      `Missing required environment variables: ${result.missing.join(", ")}`,
    );
  }
}
