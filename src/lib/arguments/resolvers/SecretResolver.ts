/**
 * Secret Resolver
 *
 * Secure resolution of secrets and sensitive configuration.
 * Supports multiple secret sources with caching and audit logging.
 *
 * @module arguments/resolvers/secret
 * @version 1.0.0
 */

import type {
  DynamicArgument,
  DynamicResolutionContext,
} from "../types/argumentTypes.js";
import { logger } from "../../utils/logger.js";

// ============================================================================
// Secret Provider Types
// ============================================================================

/**
 * Secret provider interface
 */
export type SecretProvider = {
  /** Provider name */
  name: string;

  /** Get a secret by key */
  getSecret: (key: string) => Promise<string | undefined>;

  /** Check if provider is available */
  isAvailable: () => Promise<boolean>;

  /** Optional: List available secrets (for debugging) */
  listSecrets?: () => Promise<string[]>;
};

/**
 * Secret resolution result
 */
export type SecretResolutionResult = {
  /** The resolved secret value */
  value: string | undefined;

  /** Which provider resolved the secret */
  provider: string;

  /** Whether the value was from cache */
  fromCache: boolean;

  /** Time taken to resolve */
  resolutionTime: number;
};

/**
 * Secret cache entry
 */
type SecretCacheEntry = {
  value: string;
  expiresAt: number;
  provider: string;
};

// ============================================================================
// Built-in Providers
// ============================================================================

/**
 * Environment variable secret provider
 */
export const envSecretProvider: SecretProvider = {
  name: "env",
  async getSecret(key: string): Promise<string | undefined> {
    return process.env[key];
  },
  async isAvailable(): Promise<boolean> {
    return true;
  },
};

/**
 * Create a file-based secret provider
 */
export function createFileSecretProvider(secretsDir: string): SecretProvider {
  return {
    name: "file",
    async getSecret(key: string): Promise<string | undefined> {
      try {
        const fs = await import("fs/promises");
        const path = await import("path");

        const secretPath = path.join(secretsDir, key);
        const content = await fs.readFile(secretPath, "utf-8");
        return content.trim();
      } catch {
        return undefined;
      }
    },
    async isAvailable(): Promise<boolean> {
      try {
        const fs = await import("fs/promises");
        await fs.access(secretsDir);
        return true;
      } catch {
        return false;
      }
    },
    async listSecrets(): Promise<string[]> {
      try {
        const fs = await import("fs/promises");
        return await fs.readdir(secretsDir);
      } catch {
        return [];
      }
    },
  };
}

/**
 * Create a mock secret provider for testing
 */
export function createMockSecretProvider(
  secrets: Record<string, string>,
): SecretProvider {
  return {
    name: "mock",
    async getSecret(key: string): Promise<string | undefined> {
      return secrets[key];
    },
    async isAvailable(): Promise<boolean> {
      return true;
    },
    async listSecrets(): Promise<string[]> {
      return Object.keys(secrets);
    },
  };
}

// ============================================================================
// Secret Manager
// ============================================================================

/**
 * Configuration for SecretManager
 */
export type SecretManagerConfig = {
  /** Secret providers in priority order */
  providers?: SecretProvider[];

  /** Enable caching */
  enableCache?: boolean;

  /** Cache TTL in milliseconds */
  cacheTtl?: number;

  /** Maximum cache size */
  maxCacheSize?: number;

  /** Enable audit logging */
  enableAuditLog?: boolean;

  /** Redact secrets in logs */
  redactInLogs?: boolean;
};

/**
 * Default configuration
 */
const DEFAULT_SECRET_CONFIG: Required<SecretManagerConfig> = {
  providers: [envSecretProvider],
  enableCache: true,
  cacheTtl: 300000, // 5 minutes
  maxCacheSize: 100,
  enableAuditLog: true,
  redactInLogs: true,
};

/**
 * Secret Manager for secure secret resolution
 */
export class SecretManager {
  private static instance: SecretManager;
  private providers: SecretProvider[];
  private cache = new Map<string, SecretCacheEntry>();
  private config: Required<SecretManagerConfig>;

  private constructor(config: SecretManagerConfig = {}) {
    this.config = { ...DEFAULT_SECRET_CONFIG, ...config };
    // Create a copy of the providers array to avoid mutation issues
    this.providers = [...this.config.providers];
  }

  /**
   * Get the singleton instance
   */
  static getInstance(config?: SecretManagerConfig): SecretManager {
    if (!SecretManager.instance) {
      SecretManager.instance = new SecretManager(config);
    }
    return SecretManager.instance;
  }

  /**
   * Add a secret provider
   */
  addProvider(
    provider: SecretProvider,
    priority: "first" | "last" = "last",
  ): void {
    if (priority === "first") {
      this.providers.unshift(provider);
    } else {
      this.providers.push(provider);
    }
  }

  /**
   * Remove a secret provider by name
   */
  removeProvider(name: string): boolean {
    const index = this.providers.findIndex((p) => p.name === name);
    if (index >= 0) {
      this.providers.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get a secret by key
   */
  async getSecret(key: string): Promise<SecretResolutionResult> {
    const startTime = Date.now();

    // Check cache first
    if (this.config.enableCache) {
      const cached = this.cache.get(key);
      if (cached && cached.expiresAt > Date.now()) {
        this.logAccess(key, cached.provider, true);
        return {
          value: cached.value,
          provider: cached.provider,
          fromCache: true,
          resolutionTime: Date.now() - startTime,
        };
      }
    }

    // Try each provider in order
    for (const provider of this.providers) {
      try {
        const isAvailable = await provider.isAvailable();
        if (!isAvailable) {
          continue;
        }

        const value = await provider.getSecret(key);
        if (value !== undefined) {
          // Cache the result
          if (this.config.enableCache) {
            this.cacheSecret(key, value, provider.name);
          }

          this.logAccess(key, provider.name, false);

          return {
            value,
            provider: provider.name,
            fromCache: false,
            resolutionTime: Date.now() - startTime,
          };
        }
      } catch (error) {
        logger.warn(
          `[SecretManager] Provider ${provider.name} failed for key ${key}`,
          {
            error: error instanceof Error ? error.message : String(error),
          },
        );
      }
    }

    this.logAccess(key, "none", false, true);

    return {
      value: undefined,
      provider: "none",
      fromCache: false,
      resolutionTime: Date.now() - startTime,
    };
  }

  /**
   * Get a required secret (throws if not found)
   */
  async requireSecret(key: string): Promise<string> {
    const result = await this.getSecret(key);
    if (result.value === undefined) {
      throw new Error(`Required secret '${key}' not found`);
    }
    return result.value;
  }

  /**
   * Cache a secret value
   */
  private cacheSecret(key: string, value: string, provider: string): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.config.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.config.cacheTtl,
      provider,
    });
  }

  /**
   * Log secret access for auditing
   */
  private logAccess(
    key: string,
    provider: string,
    fromCache: boolean,
    notFound: boolean = false,
  ): void {
    if (!this.config.enableAuditLog) {
      return;
    }

    if (notFound) {
      logger.debug(`[SecretManager] Secret not found: ${key}`);
    } else {
      logger.debug(`[SecretManager] Secret accessed: ${key}`, {
        provider,
        fromCache,
        // Never log the actual value
      });
    }
  }

  /**
   * Clear the secret cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Invalidate a specific cache entry
   */
  invalidate(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Get available providers
   */
  getProviders(): string[] {
    return this.providers.map((p) => p.name);
  }

  /**
   * Reset the singleton instance (for testing)
   */
  static resetInstance(): void {
    if (SecretManager.instance) {
      SecretManager.instance.clearCache();
      SecretManager.instance = null as unknown as SecretManager;
    }
  }
}

// ============================================================================
// Dynamic Argument Factories
// ============================================================================

/**
 * Create a dynamic argument that resolves from a secret.
 *
 * @example
 * ```typescript
 * const apiKey = fromSecret("OPENAI_API_KEY");
 * const result = await resolveDynamicArgument(apiKey);
 * ```
 */
export function fromSecret(key: string): DynamicArgument<string> {
  return async (): Promise<string> => {
    return SecretManager.getInstance().requireSecret(key);
  };
}

/**
 * Create a dynamic argument that resolves from a secret with a default.
 */
export function fromSecretOptional(
  key: string,
  defaultValue: string = "",
): DynamicArgument<string> {
  return async (): Promise<string> => {
    const result = await SecretManager.getInstance().getSecret(key);
    return result.value ?? defaultValue;
  };
}

/**
 * Create a dynamic argument that resolves an API key for a provider.
 *
 * @example
 * ```typescript
 * const apiKey = fromApiKey("openai"); // Checks OPENAI_API_KEY
 * ```
 */
export function fromApiKey(provider: string): DynamicArgument<string> {
  const key = `${provider.toUpperCase()}_API_KEY`;

  return async (): Promise<string> => {
    return SecretManager.getInstance().requireSecret(key);
  };
}

/**
 * Create a dynamic argument for tenant-specific secrets.
 *
 * @example
 * ```typescript
 * const tenantApiKey = fromTenantSecret("API_KEY");
 * // Will look for TENANT_<tenantId>_API_KEY
 * ```
 */
export function fromTenantSecret(secretName: string): DynamicArgument<string> {
  return async (context: DynamicResolutionContext): Promise<string> => {
    const tenantId = context.requestContext.tenant?.id;
    if (!tenantId) {
      throw new Error("Tenant ID required for tenant-specific secret");
    }

    const key = `TENANT_${tenantId.toUpperCase()}_${secretName}`;
    return SecretManager.getInstance().requireSecret(key);
  };
}

/**
 * Create a dynamic argument for user-specific secrets.
 */
export function fromUserSecret(secretName: string): DynamicArgument<string> {
  return async (context: DynamicResolutionContext): Promise<string> => {
    const userId = context.requestContext.user?.id;
    if (!userId) {
      throw new Error("User ID required for user-specific secret");
    }

    const key = `USER_${userId.toUpperCase()}_${secretName}`;
    return SecretManager.getInstance().requireSecret(key);
  };
}

// ============================================================================
// Secret Resolution with Fallback
// ============================================================================

/**
 * Create a dynamic argument that tries multiple secret keys.
 *
 * @example
 * ```typescript
 * const apiKey = fromSecretChain([
 *   "OPENAI_API_KEY",
 *   "AI_API_KEY",
 *   "DEFAULT_API_KEY",
 * ]);
 * ```
 */
export function fromSecretChain(keys: string[]): DynamicArgument<string> {
  return async (): Promise<string> => {
    const manager = SecretManager.getInstance();

    for (const key of keys) {
      const result = await manager.getSecret(key);
      if (result.value !== undefined) {
        return result.value;
      }
    }

    throw new Error(`No secret found for keys: ${keys.join(", ")}`);
  };
}

/**
 * Create a dynamic argument with tenant fallback to global.
 *
 * @example
 * ```typescript
 * const apiKey = fromSecretWithTenantFallback("API_KEY");
 * // First checks TENANT_<id>_API_KEY, then API_KEY
 * ```
 */
export function fromSecretWithTenantFallback(
  secretName: string,
): DynamicArgument<string> {
  return async (context: DynamicResolutionContext): Promise<string> => {
    const manager = SecretManager.getInstance();
    const tenantId = context.requestContext.tenant?.id;

    // Try tenant-specific first
    if (tenantId) {
      const tenantKey = `TENANT_${tenantId.toUpperCase()}_${secretName}`;
      const result = await manager.getSecret(tenantKey);
      if (result.value !== undefined) {
        return result.value;
      }
    }

    // Fall back to global
    return manager.requireSecret(secretName);
  };
}

// ============================================================================
// Secret Validation
// ============================================================================

/**
 * Validate that required secrets are available
 */
export async function validateSecrets(
  required: string[],
): Promise<{ valid: boolean; missing: string[] }> {
  const manager = SecretManager.getInstance();
  const missing: string[] = [];

  for (const key of required) {
    const result = await manager.getSecret(key);
    if (result.value === undefined) {
      missing.push(key);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Assert that required secrets are available
 */
export async function assertSecrets(required: string[]): Promise<void> {
  const result = await validateSecrets(required);
  if (!result.valid) {
    throw new Error(`Missing required secrets: ${result.missing.join(", ")}`);
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Get a secret synchronously from environment (for simple cases)
 */
export function getSecretSync(key: string): string | undefined {
  return process.env[key];
}

/**
 * Get a required secret synchronously from environment
 */
export function requireSecretSync(key: string): string {
  const value = process.env[key];
  if (value === undefined) {
    throw new Error(`Required secret '${key}' not found`);
  }
  return value;
}

/**
 * Configure the global secret manager
 */
export function configureSecrets(config: SecretManagerConfig): void {
  SecretManager.resetInstance();
  SecretManager.getInstance(config);
}
