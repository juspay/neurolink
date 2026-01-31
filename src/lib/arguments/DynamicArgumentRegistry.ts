/**
 * Dynamic Argument Registry
 *
 * Registry for managing named dynamic argument resolvers.
 * Enables registration, lookup, and lifecycle management of resolvers.
 *
 * @module arguments/registry
 * @version 1.0.0
 */

import { BaseRegistry } from "../core/infrastructure/index.js";
import { logger } from "../utils/logger.js";
import type {
  DynamicArgument,
  DynamicResolutionContext,
  ResolverMetadata,
  RegisteredResolver,
  ResolutionOptions,
  ResolutionResult,
} from "./types/argumentTypes.js";
import {
  getResolutionType,
  isAsyncArgument,
  requiresContext,
} from "./ArgumentValidators.js";
import { ArgumentResolver } from "./ArgumentResolver.js";

/**
 * Options for registering a resolver
 */
export type RegisterResolverOptions<T> = {
  /** Resolver description */
  description?: string;

  /** Resolver version */
  version?: string;

  /** Tags for categorization */
  tags?: string[];

  /** Default resolution options */
  defaultOptions?: ResolutionOptions<T>;

  /** Override if already registered */
  override?: boolean;
};

/**
 * Filter options for listing resolvers
 */
export type ResolverFilter = {
  /** Filter by tags */
  tags?: string[];

  /** Filter by async/sync */
  isAsync?: boolean;

  /** Filter by context requirement */
  requiresContext?: boolean;

  /** Filter by name pattern (regex) */
  namePattern?: string | RegExp;
};

// ============================================================================
// Dynamic Argument Registry
// ============================================================================

/**
 * Registry for managing named dynamic argument resolvers.
 *
 * @example Basic usage
 * ```typescript
 * const registry = DynamicArgumentRegistry.getInstance();
 *
 * // Register a resolver
 * registry.register("tenant-model", ({ requestContext }) => {
 *   return requestContext.tenant?.settings?.defaultModel || "gpt-4o";
 * });
 *
 * // Use the resolver
 * const result = await registry.resolve("tenant-model", context);
 * ```
 *
 * @example With options
 * ```typescript
 * registry.register(
 *   "cached-config",
 *   async () => await fetchRemoteConfig(),
 *   {
 *     description: "Fetches remote configuration",
 *     tags: ["config", "async"],
 *     defaultOptions: { cache: true, cacheTtl: 300000 }
 *   }
 * );
 * ```
 */
export class DynamicArgumentRegistry extends BaseRegistry<
  RegisteredResolver<unknown>,
  ResolverMetadata
> {
  private static instance: DynamicArgumentRegistry;
  private resolver: ArgumentResolver;

  private constructor() {
    super();
    this.resolver = new ArgumentResolver();
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): DynamicArgumentRegistry {
    if (!DynamicArgumentRegistry.instance) {
      DynamicArgumentRegistry.instance = new DynamicArgumentRegistry();
    }
    return DynamicArgumentRegistry.instance;
  }

  /**
   * Required by BaseRegistry - registers built-in resolvers
   */
  protected async registerAll(): Promise<void> {
    // Register built-in resolvers
    this.registerBuiltins();
    logger.debug("[DynamicArgumentRegistry] Built-in resolvers registered");
  }

  /**
   * Register built-in resolvers
   */
  private registerBuiltins(): void {
    // Environment variable resolver
    this.register(
      "env",
      (context: DynamicResolutionContext) => {
        const key = context.requestContext.custom?.envKey as string;
        return key ? process.env[key] : undefined;
      },
      {
        description: "Resolves environment variables",
        tags: ["builtin", "env"],
      },
    );

    // Current timestamp resolver
    this.register("timestamp", () => Date.now(), {
      description: "Returns current timestamp",
      tags: ["builtin", "time"],
    });

    // Request ID resolver
    this.register(
      "request-id",
      (context: DynamicResolutionContext) => context.requestContext.requestId,
      {
        description: "Returns current request ID",
        tags: ["builtin", "request"],
      },
    );

    // User ID resolver
    this.register(
      "user-id",
      (context: DynamicResolutionContext) =>
        context.requestContext.user?.id || "anonymous",
      {
        description: "Returns current user ID",
        tags: ["builtin", "user"],
      },
    );

    // Tenant ID resolver
    this.register(
      "tenant-id",
      (context: DynamicResolutionContext) =>
        context.requestContext.tenant?.id || "default",
      {
        description: "Returns current tenant ID",
        tags: ["builtin", "tenant"],
      },
    );

    // Tenant plan resolver
    this.register(
      "tenant-plan",
      (context: DynamicResolutionContext) =>
        context.requestContext.tenant?.plan || "free",
      {
        description: "Returns current tenant plan",
        tags: ["builtin", "tenant"],
      },
    );
  }

  /**
   * Register a new resolver
   */
  register<T>(
    id: string,
    resolver: DynamicArgument<T>,
    options: RegisterResolverOptions<T> = {},
  ): void {
    // Check if already registered
    if (this.has(id) && !options.override) {
      throw new Error(
        `Resolver '${id}' already registered. Use override: true to replace.`,
      );
    }

    // Compute resolution type for logging (but use simpler checks for metadata)
    const _resType = getResolutionType(resolver); // Keep for potential future use
    void _resType; // Silence unused variable warning
    const isAsync = isAsyncArgument(resolver);
    const needsContext = requiresContext(resolver);

    const metadata: ResolverMetadata = {
      name: id,
      description: options.description,
      version: options.version,
      isAsync,
      requiresContext: needsContext,
      tags: options.tags,
    };

    const registeredResolver: RegisteredResolver<T> = {
      id,
      resolver,
      metadata,
      defaultOptions: options.defaultOptions,
    };

    // Use parent class register method
    super.register(
      id,
      async () => registeredResolver as RegisteredResolver<unknown>,
      metadata,
    );

    logger.debug(`[DynamicArgumentRegistry] Registered resolver: ${id}`, {
      isAsync,
      requiresContext: needsContext,
      tags: options.tags,
    });
  }

  /**
   * Unregister a resolver
   */
  unregister(id: string): boolean {
    if (!this.has(id)) {
      return false;
    }

    // Access the protected items map
    const deleted = (
      this as unknown as { items: Map<string, unknown> }
    ).items.delete(id);
    logger.debug(`[DynamicArgumentRegistry] Unregistered resolver: ${id}`);
    return deleted;
  }

  /**
   * Resolve a registered resolver by ID
   */
  async resolve<T>(
    id: string,
    context?: DynamicResolutionContext,
    options?: ResolutionOptions<T>,
  ): Promise<ResolutionResult<T>> {
    await this.ensureInitialized();

    const entry = await this.get(id);
    if (!entry) {
      throw new Error(`Resolver '${id}' not found`);
    }

    const mergedOptions: ResolutionOptions<T> = {
      ...(entry.defaultOptions as ResolutionOptions<T> | undefined),
      ...options,
      argumentId: id,
    };

    return this.resolver.resolve<T>(
      entry.resolver as DynamicArgument<T>,
      context,
      mergedOptions,
    );
  }

  /**
   * Get resolver metadata by ID
   */
  async getMetadata(id: string): Promise<ResolverMetadata | undefined> {
    await this.ensureInitialized();

    const entry = await this.get(id);
    return entry?.metadata;
  }

  /**
   * List all registered resolvers with optional filtering
   */
  listResolvers(filter?: ResolverFilter): Array<{
    id: string;
    metadata: ResolverMetadata;
  }> {
    const all = this.list();

    if (!filter) {
      return all;
    }

    return all.filter(({ id, metadata }) => {
      // Filter by tags
      if (filter.tags && filter.tags.length > 0) {
        const hasTags = filter.tags.every((tag) =>
          metadata.tags?.includes(tag),
        );
        if (!hasTags) {
          return false;
        }
      }

      // Filter by async
      if (filter.isAsync !== undefined && metadata.isAsync !== filter.isAsync) {
        return false;
      }

      // Filter by context requirement
      if (
        filter.requiresContext !== undefined &&
        metadata.requiresContext !== filter.requiresContext
      ) {
        return false;
      }

      // Filter by name pattern
      if (filter.namePattern) {
        const pattern =
          filter.namePattern instanceof RegExp
            ? filter.namePattern
            : new RegExp(filter.namePattern);
        if (!pattern.test(id)) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Get resolvers by tag
   */
  getByTag(tag: string): Array<{ id: string; metadata: ResolverMetadata }> {
    return this.listResolvers({ tags: [tag] });
  }

  /**
   * Check if a resolver exists
   */
  hasResolver(id: string): boolean {
    return this.has(id);
  }

  /**
   * Create a dynamic argument that uses a registered resolver
   *
   * @example
   * ```typescript
   * const registry = DynamicArgumentRegistry.getInstance();
   * registry.register("model-selector", ({ requestContext }) => {
   *   return requestContext.tenant?.plan === "enterprise" ? "claude-3-opus" : "gpt-4o";
   * });
   *
   * // Create a reference to use elsewhere
   * const modelArg = registry.createRef("model-selector");
   *
   * // Use it in generate options
   * await neurolink.generate({
   *   model: modelArg,
   *   input: { text: "Hello" }
   * });
   * ```
   */
  createRef<T>(id: string): DynamicArgument<T> {
    return async (context: DynamicResolutionContext): Promise<T> => {
      const result = await this.resolve<T>(id, context);
      return result.value;
    };
  }

  /**
   * Compose multiple resolvers into a single resolver
   *
   * @example
   * ```typescript
   * const composed = registry.compose(
   *   ["base-model", "tenant-override", "user-preference"],
   *   (results) => results.find(r => r !== undefined) || "gpt-4o"
   * );
   * ```
   */
  compose<T, R>(
    ids: string[],
    combiner: (results: T[]) => R,
  ): DynamicArgument<R> {
    return async (context: DynamicResolutionContext): Promise<R> => {
      const results = await Promise.all(
        ids.map(async (id) => {
          const result = await this.resolve<T>(id, context, {
            throwOnError: false,
          });
          return result.value;
        }),
      );

      return combiner(results);
    };
  }

  /**
   * Create a resolver chain with fallback behavior
   */
  chain<T>(...ids: string[]): DynamicArgument<T | undefined> {
    return async (
      context: DynamicResolutionContext,
    ): Promise<T | undefined> => {
      for (const id of ids) {
        try {
          const result = await this.resolve<T>(id, context, {
            throwOnError: false,
          });
          if (result.value !== undefined && result.value !== null) {
            return result.value;
          }
        } catch {
          // Continue to next resolver
        }
      }
      return undefined;
    };
  }

  /**
   * Dispose of the registry
   */
  dispose(): void {
    this.resolver.dispose();
    this.clear();
  }

  /**
   * Reset the singleton instance (for testing)
   */
  static resetInstance(): void {
    if (DynamicArgumentRegistry.instance) {
      DynamicArgumentRegistry.instance.dispose();
      DynamicArgumentRegistry.instance =
        null as unknown as DynamicArgumentRegistry;
    }
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Get the global registry instance
 */
export function getArgumentRegistry(): DynamicArgumentRegistry {
  return DynamicArgumentRegistry.getInstance();
}

/**
 * Register a resolver in the global registry
 */
export function registerResolver<T>(
  id: string,
  resolver: DynamicArgument<T>,
  options?: RegisterResolverOptions<T>,
): void {
  getArgumentRegistry().register(id, resolver, options);
}

/**
 * Resolve using a registered resolver from the global registry
 */
export async function resolveRegistered<T>(
  id: string,
  context?: DynamicResolutionContext,
  options?: ResolutionOptions<T>,
): Promise<ResolutionResult<T>> {
  return getArgumentRegistry().resolve(id, context, options);
}

/**
 * Create a reference to a registered resolver
 */
export function resolverRef<T>(id: string): DynamicArgument<T> {
  return getArgumentRegistry().createRef(id);
}
