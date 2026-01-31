/**
 * Request Context System
 *
 * Provides AsyncLocalStorage-based context propagation for thread-safe
 * request context management. Enables dynamic arguments to access
 * request, user, tenant, and session information without explicit passing.
 *
 * @module dynamic/requestContext
 */

import { AsyncLocalStorage } from "async_hooks";
import type {
  RequestContext,
  DynamicResolutionContext,
  UserPreferences,
  TenantQuotas,
  TenantSettings,
} from "./types.js";
import type { UnknownRecord } from "../types/common.js";
import { logger } from "../utils/logger.js";

/**
 * AsyncLocalStorage for thread-safe context propagation
 */
const contextStorage = new AsyncLocalStorage<RequestContext>();

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Create a new request context
 *
 * @example
 * ```typescript
 * const context = createRequestContext({
 *   user: { id: "user123", email: "user@example.com" },
 *   tenant: { id: "tenant456", plan: "enterprise" },
 * });
 * ```
 */
export function createRequestContext(
  options?: Partial<Omit<RequestContext, "requestId" | "timestamp">>,
): RequestContext {
  return {
    requestId: generateRequestId(),
    timestamp: Date.now(),
    ...options,
    runtime: options?.runtime || new Map(),
  };
}

/**
 * Run a function with request context
 * Context is automatically propagated to all async operations
 *
 * @example
 * ```typescript
 * await withRequestContext(
 *   { user: { id: "user123" }, tenant: { id: "tenant456" } },
 *   async () => {
 *     // Context is available here and in all nested calls
 *     const ctx = getCurrentContext();
 *     console.log(ctx?.user?.id); // "user123"
 *   }
 * );
 * ```
 */
export function withRequestContext<T>(
  context: Partial<Omit<RequestContext, "requestId" | "timestamp">>,
  fn: () => T | Promise<T>,
): Promise<T> {
  const fullContext = createRequestContext(context);

  logger.debug("Starting request context", {
    requestId: fullContext.requestId,
    userId: fullContext.user?.id,
    tenantId: fullContext.tenant?.id,
  });

  return contextStorage.run(fullContext, async () => {
    try {
      return await fn();
    } finally {
      logger.debug("Request context completed", {
        requestId: fullContext.requestId,
        duration: Date.now() - fullContext.timestamp,
      });
    }
  });
}

/**
 * Get the current request context
 * Returns undefined if called outside of withRequestContext
 */
export function getCurrentContext(): RequestContext | undefined {
  return contextStorage.getStore();
}

/**
 * Get the current request context or throw if not available
 */
export function requireContext(): RequestContext {
  const context = getCurrentContext();
  if (!context) {
    throw new Error(
      "Request context required. Ensure this code is running within withRequestContext.",
    );
  }
  return context;
}

/**
 * Check if there is an active request context
 */
export function hasContext(): boolean {
  return contextStorage.getStore() !== undefined;
}

/**
 * Update the current request context
 *
 * @example
 * ```typescript
 * // Add user information mid-request (e.g., after authentication)
 * updateCurrentContext({
 *   user: { id: "user123", email: "user@example.com" }
 * });
 * ```
 */
export function updateCurrentContext(
  updates: Partial<Omit<RequestContext, "requestId" | "timestamp">>,
): void {
  const current = getCurrentContext();
  if (!current) {
    logger.warn("Cannot update context - no active context");
    return;
  }

  // Merge updates into current context
  if (updates.user) {
    current.user = {
      ...current.user,
      ...updates.user,
    } as RequestContext["user"];
  }
  if (updates.tenant) {
    current.tenant = {
      ...current.tenant,
      ...updates.tenant,
    } as RequestContext["tenant"];
  }
  if (updates.session) {
    current.session = {
      ...current.session,
      ...updates.session,
    } as RequestContext["session"];
  }
  if (updates.resource) {
    current.resource = {
      ...current.resource,
      ...updates.resource,
    } as RequestContext["resource"];
  }
  if (updates.custom) {
    current.custom = { ...current.custom, ...updates.custom };
  }
  if (updates.environment) {
    current.environment = {
      ...current.environment,
      ...updates.environment,
    } as RequestContext["environment"];
  }
  if (updates.runtime) {
    if (!current.runtime) {
      current.runtime = new Map();
    }
    for (const [key, value] of updates.runtime) {
      current.runtime.set(key, value);
    }
  }
}

/**
 * Set a runtime value in the current context
 *
 * @example
 * ```typescript
 * setRuntimeValue("taskComplexity", "high");
 * setRuntimeValue("estimatedTokens", 5000);
 * ```
 */
export function setRuntimeValue(key: string, value: unknown): void {
  const context = getCurrentContext();
  if (!context) {
    logger.warn("Cannot set runtime value - no active context");
    return;
  }

  if (!context.runtime) {
    context.runtime = new Map();
  }

  context.runtime.set(key, value);
}

/**
 * Get a runtime value from the current context
 */
export function getRuntimeValue<T>(key: string): T | undefined {
  const context = getCurrentContext();
  return context?.runtime?.get(key) as T | undefined;
}

/**
 * Delete a runtime value from the current context
 */
export function deleteRuntimeValue(key: string): boolean {
  const context = getCurrentContext();
  if (!context?.runtime) {
    return false;
  }
  return context.runtime.delete(key);
}

/**
 * Clear all runtime values from the current context
 */
export function clearRuntimeValues(): void {
  const context = getCurrentContext();
  if (context?.runtime) {
    context.runtime.clear();
  }
}

/**
 * Create a DynamicResolutionContext from the current RequestContext
 *
 * @param neurolink - Optional NeuroLink instance for additional capabilities
 */
export function createResolutionContext(
  neurolink?: {
    getAvailableTools: () => Promise<string[]>;
    getProviderStatus: (provider: string) => Promise<boolean>;
    getRuntimeContext: () => Map<string, unknown> | undefined;
  },
  signal?: AbortSignal,
): DynamicResolutionContext {
  const requestContext = getCurrentContext() || createRequestContext();

  return {
    requestContext,
    neurolink,
    signal,
  };
}

/**
 * Create a DynamicResolutionContext from an explicit RequestContext
 */
export function createResolutionContextFromRequest(
  requestContext: RequestContext,
  neurolink?: {
    getAvailableTools: () => Promise<string[]>;
    getProviderStatus: (provider: string) => Promise<boolean>;
    getRuntimeContext: () => Map<string, unknown> | undefined;
  },
  signal?: AbortSignal,
): DynamicResolutionContext {
  return {
    requestContext,
    neurolink,
    signal,
  };
}

/**
 * Middleware-style context creator for HTTP requests
 *
 * @example Express middleware
 * ```typescript
 * app.use((req, res, next) => {
 *   const context = createContextFromRequest(req);
 *   withRequestContext(context, next);
 * });
 * ```
 */
export function createContextFromRequest(request: {
  headers?: Record<string, string | string[] | undefined>;
  user?: { id: string; email?: string; [key: string]: unknown };
  tenant?: { id: string; [key: string]: unknown };
  session?: { id: string; [key: string]: unknown };
}): Partial<RequestContext> {
  const context: Partial<RequestContext> = {};

  // Extract user from request
  if (request.user) {
    context.user = {
      id: request.user.id,
      email: request.user.email,
      metadata: request.user as UnknownRecord,
    };
  }

  // Extract tenant from request
  if (request.tenant) {
    context.tenant = {
      id: request.tenant.id,
      metadata: request.tenant as UnknownRecord,
    };
  }

  // Extract session from request
  if (request.session) {
    context.session = {
      id: request.session.id,
      startedAt: Date.now(),
      metadata: request.session as UnknownRecord,
    };
  }

  // Extract from headers
  if (request.headers) {
    const userId = request.headers["x-user-id"];
    const tenantId = request.headers["x-tenant-id"];
    const sessionId = request.headers["x-session-id"];

    if (userId && !context.user) {
      context.user = { id: Array.isArray(userId) ? userId[0] : userId };
    }
    if (tenantId && !context.tenant) {
      context.tenant = { id: Array.isArray(tenantId) ? tenantId[0] : tenantId };
    }
    if (sessionId && !context.session) {
      context.session = {
        id: Array.isArray(sessionId) ? sessionId[0] : sessionId,
        startedAt: Date.now(),
      };
    }
  }

  return context;
}

/**
 * Context builder for fluent API
 *
 * @example
 * ```typescript
 * const context = new RequestContextBuilder()
 *   .withUser({ id: "user123", email: "user@example.com" })
 *   .withTenant({ id: "tenant456", plan: "enterprise" })
 *   .withSession({ id: "session789" })
 *   .withRuntimeValue("taskType", "analysis")
 *   .build();
 * ```
 */
export class RequestContextBuilder {
  private context: Partial<RequestContext> = {};

  withUser(user: RequestContext["user"]): this {
    this.context.user = user;
    return this;
  }

  withUserPreferences(preferences: UserPreferences): this {
    if (!this.context.user) {
      throw new Error("User must be set before adding preferences");
    }
    this.context.user = {
      ...this.context.user,
      preferences,
    };
    return this;
  }

  withTenant(tenant: RequestContext["tenant"]): this {
    this.context.tenant = tenant;
    return this;
  }

  withTenantQuotas(quotas: TenantQuotas): this {
    if (!this.context.tenant) {
      throw new Error("Tenant must be set before adding quotas");
    }
    this.context.tenant = {
      ...this.context.tenant,
      quotas,
    };
    return this;
  }

  withTenantSettings(settings: TenantSettings): this {
    if (!this.context.tenant) {
      throw new Error("Tenant must be set before adding settings");
    }
    this.context.tenant = {
      ...this.context.tenant,
      settings,
    };
    return this;
  }

  withSession(session: Partial<NonNullable<RequestContext["session"]>>): this {
    this.context.session = {
      id: session.id || `session_${Date.now()}`,
      startedAt: session.startedAt || Date.now(),
      ...session,
    };
    return this;
  }

  withResource(resource: RequestContext["resource"]): this {
    this.context.resource = resource;
    return this;
  }

  withCustom(custom: UnknownRecord): this {
    this.context.custom = { ...this.context.custom, ...custom };
    return this;
  }

  withEnvironment(environment: RequestContext["environment"]): this {
    this.context.environment = environment;
    return this;
  }

  withRuntimeValue(key: string, value: unknown): this {
    if (!this.context.runtime) {
      this.context.runtime = new Map();
    }
    this.context.runtime.set(key, value);
    return this;
  }

  withRuntimeValues(values: Record<string, unknown>): this {
    if (!this.context.runtime) {
      this.context.runtime = new Map();
    }
    for (const [key, value] of Object.entries(values)) {
      this.context.runtime.set(key, value);
    }
    return this;
  }

  build(): RequestContext {
    return createRequestContext(this.context);
  }

  /**
   * Build and run a function with this context
   */
  async run<T>(fn: () => T | Promise<T>): Promise<T> {
    return withRequestContext(this.context, fn);
  }
}

/**
 * Create a child context that inherits from the current context
 * Useful for sub-requests or nested operations
 */
export function createChildContext(
  overrides?: Partial<Omit<RequestContext, "requestId" | "timestamp">>,
): RequestContext {
  const parent = getCurrentContext();
  if (!parent) {
    return createRequestContext(overrides);
  }

  // Create a new context inheriting from parent
  const childRuntime = new Map(parent.runtime);
  if (overrides?.runtime) {
    for (const [key, value] of overrides.runtime) {
      childRuntime.set(key, value);
    }
  }

  return createRequestContext({
    user: overrides?.user ?? parent.user,
    tenant: overrides?.tenant ?? parent.tenant,
    session: overrides?.session ?? parent.session,
    resource: overrides?.resource ?? parent.resource,
    custom: { ...parent.custom, ...overrides?.custom },
    environment: overrides?.environment ?? parent.environment,
    runtime: childRuntime,
  });
}

/**
 * Run a function with a child context
 */
export function withChildContext<T>(
  overrides: Partial<Omit<RequestContext, "requestId" | "timestamp">>,
  fn: () => T | Promise<T>,
): Promise<T> {
  const childContext = createChildContext(overrides);
  return contextStorage.run(childContext, async () => {
    return await fn();
  });
}

// Re-export types for convenience
export type { RequestContext, DynamicResolutionContext };
