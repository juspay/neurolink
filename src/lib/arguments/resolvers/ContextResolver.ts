/**
 * Context Resolver
 *
 * AsyncLocalStorage-based request context management.
 * Provides thread-safe context propagation through async operations.
 *
 * @module arguments/resolvers/context
 * @version 1.0.0
 */

import { AsyncLocalStorage } from "node:async_hooks";
import type {
  RequestContext,
  DynamicResolutionContext,
  CreateRequestContextOptions,
  RequestContextUser,
  RequestContextTenant,
  RequestContextSession,
  RequestContextEnvironment,
} from "../types/argumentTypes.js";
import {
  createRequestContext,
  generateRequestId,
} from "../ArgumentValidators.js";

// ============================================================================
// AsyncLocalStorage Instance
// ============================================================================

/**
 * AsyncLocalStorage for request context
 */
const contextStorage = new AsyncLocalStorage<RequestContext>();

// ============================================================================
// Context Access Functions
// ============================================================================

/**
 * Get the current request context from AsyncLocalStorage.
 * Returns undefined if not within a context scope.
 *
 * @example
 * ```typescript
 * await withRequestContext({ user: { id: "user1" } }, async () => {
 *   const ctx = getCurrentContext();
 *   console.log(ctx?.user?.id); // "user1"
 * });
 * ```
 */
export function getCurrentContext(): RequestContext | undefined {
  return contextStorage.getStore();
}

/**
 * Get the current request context, throwing if not available.
 */
export function requireCurrentContext(): RequestContext {
  const context = getCurrentContext();
  if (!context) {
    throw new Error(
      "No request context available. Ensure code is running within withRequestContext().",
    );
  }
  return context;
}

/**
 * Get a specific value from the current context.
 */
export function getContextValue<T>(path: string): T | undefined {
  const context = getCurrentContext();
  if (!context) {
    return undefined;
  }

  // Navigate the path (e.g., "user.id", "tenant.plan")
  const parts = path.split(".");
  let current: unknown = context;

  for (const part of parts) {
    if (current === undefined || current === null) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current as T | undefined;
}

// ============================================================================
// Context Scope Functions
// ============================================================================

/**
 * Run a function with a request context.
 * The context is available via getCurrentContext() anywhere in the async chain.
 *
 * @example
 * ```typescript
 * const result = await withRequestContext(
 *   { user: { id: "user1" }, tenant: { id: "tenant1", plan: "enterprise" } },
 *   async () => {
 *     // Context is available anywhere in this async chain
 *     const response = await someAsyncOperation();
 *     return response;
 *   }
 * );
 * ```
 */
export function withRequestContext<T>(
  options: CreateRequestContextOptions | RequestContext,
  fn: () => T | Promise<T>,
): Promise<T> {
  // Create context if options don't have requestId (meaning it's options, not a full context)
  const context: RequestContext =
    "requestId" in options && "timestamp" in options
      ? (options as RequestContext)
      : createRequestContext(options as CreateRequestContextOptions);

  return new Promise((resolve, reject) => {
    contextStorage.run(context, async () => {
      try {
        const result = await fn();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  });
}

/**
 * Run a function with an updated context (merges with current context).
 */
export function withUpdatedContext<T>(
  updates: Partial<RequestContext>,
  fn: () => T | Promise<T>,
): Promise<T> {
  const currentContext = getCurrentContext();

  const newContext: RequestContext = currentContext
    ? { ...currentContext, ...updates }
    : {
        requestId: updates.requestId || generateRequestId(),
        timestamp: updates.timestamp || Date.now(),
        ...updates,
      };

  return withRequestContext(newContext, fn);
}

/**
 * Run a function with merged user context.
 */
export function withUser<T>(
  user: RequestContextUser,
  fn: () => T | Promise<T>,
): Promise<T> {
  const currentContext = getCurrentContext();

  const newContext: RequestContext = {
    ...(currentContext || {
      requestId: generateRequestId(),
      timestamp: Date.now(),
    }),
    user: currentContext?.user ? { ...currentContext.user, ...user } : user,
  };

  return withRequestContext(newContext, fn);
}

/**
 * Run a function with merged tenant context.
 */
export function withTenant<T>(
  tenant: RequestContextTenant,
  fn: () => T | Promise<T>,
): Promise<T> {
  const currentContext = getCurrentContext();

  const newContext: RequestContext = {
    ...(currentContext || {
      requestId: generateRequestId(),
      timestamp: Date.now(),
    }),
    tenant: currentContext?.tenant
      ? { ...currentContext.tenant, ...tenant }
      : tenant,
  };

  return withRequestContext(newContext, fn);
}

/**
 * Run a function with merged session context.
 */
export function withSession<T>(
  session: RequestContextSession,
  fn: () => T | Promise<T>,
): Promise<T> {
  const currentContext = getCurrentContext();

  const newContext: RequestContext = {
    ...(currentContext || {
      requestId: generateRequestId(),
      timestamp: Date.now(),
    }),
    session: currentContext?.session
      ? { ...currentContext.session, ...session }
      : session,
  };

  return withRequestContext(newContext, fn);
}

// ============================================================================
// Runtime Values
// ============================================================================

/**
 * Set a runtime value in the current context.
 * Runtime values are mutable within a request scope.
 */
export function setRuntimeValue(key: string, value: unknown): void {
  const context = getCurrentContext();
  if (!context) {
    throw new Error("Cannot set runtime value outside of request context");
  }

  if (!context.runtime) {
    context.runtime = new Map();
  }

  context.runtime.set(key, value);
}

/**
 * Get a runtime value from the current context.
 */
export function getRuntimeValue<T>(key: string): T | undefined {
  const context = getCurrentContext();
  return context?.runtime?.get(key) as T | undefined;
}

/**
 * Delete a runtime value from the current context.
 */
export function deleteRuntimeValue(key: string): boolean {
  const context = getCurrentContext();
  return context?.runtime?.delete(key) ?? false;
}

/**
 * Check if a runtime value exists.
 */
export function hasRuntimeValue(key: string): boolean {
  const context = getCurrentContext();
  return context?.runtime?.has(key) ?? false;
}

// ============================================================================
// Context Builder
// ============================================================================

/**
 * Fluent builder for constructing request contexts.
 *
 * @example
 * ```typescript
 * const context = new RequestContextBuilder()
 *   .withUser({ id: "user1", email: "user@example.com" })
 *   .withTenant({ id: "tenant1", plan: "enterprise" })
 *   .withSession({ id: generateSessionId(), startedAt: Date.now() })
 *   .build();
 *
 * await withRequestContext(context, async () => {
 *   // ...
 * });
 * ```
 */
export class RequestContextBuilder {
  private context: Partial<RequestContext> = {};

  /**
   * Set the request ID
   */
  withRequestId(requestId: string): this {
    this.context.requestId = requestId;
    return this;
  }

  /**
   * Set user information
   */
  withUser(user: RequestContextUser): this {
    this.context.user = user;
    return this;
  }

  /**
   * Set tenant information
   */
  withTenant(tenant: RequestContextTenant): this {
    this.context.tenant = tenant;
    return this;
  }

  /**
   * Set session information
   */
  withSession(session: RequestContextSession): this {
    this.context.session = session;
    return this;
  }

  /**
   * Set environment information
   */
  withEnvironment(environment: RequestContextEnvironment): this {
    this.context.environment = environment;
    return this;
  }

  /**
   * Set custom context values
   */
  withCustom(custom: Record<string, unknown>): this {
    this.context.custom = { ...this.context.custom, ...custom };
    return this;
  }

  /**
   * Set a single custom value
   */
  withCustomValue(key: string, value: unknown): this {
    this.context.custom = { ...this.context.custom, [key]: value };
    return this;
  }

  /**
   * Set resource information
   */
  withResource(type: string, id?: string): this {
    this.context.resource = { type, id };
    return this;
  }

  /**
   * Build the request context
   */
  build(): RequestContext {
    return {
      requestId: this.context.requestId || generateRequestId(),
      timestamp: Date.now(),
      ...this.context,
    } as RequestContext;
  }

  /**
   * Build a resolution context
   */
  buildResolutionContext(
    neurolink?: DynamicResolutionContext["neurolink"],
  ): DynamicResolutionContext {
    return {
      requestContext: this.build(),
      neurolink,
    };
  }
}

// ============================================================================
// HTTP Integration
// ============================================================================

/**
 * Create a request context from HTTP request headers.
 * Useful for middleware integration.
 *
 * @example Express middleware
 * ```typescript
 * app.use((req, res, next) => {
 *   const context = createContextFromRequest(req.headers);
 *   withRequestContext(context, () => {
 *     next();
 *   }).catch(next);
 * });
 * ```
 */
export function createContextFromRequest(
  headers: Record<string, string | string[] | undefined>,
  options: {
    requestIdHeader?: string;
    userIdHeader?: string;
    tenantIdHeader?: string;
    sessionIdHeader?: string;
  } = {},
): RequestContext {
  const {
    requestIdHeader = "x-request-id",
    userIdHeader = "x-user-id",
    tenantIdHeader = "x-tenant-id",
    sessionIdHeader = "x-session-id",
  } = options;

  const getHeader = (name: string): string | undefined => {
    const value = headers[name] || headers[name.toLowerCase()];
    return Array.isArray(value) ? value[0] : value;
  };

  const context: RequestContext = {
    requestId: getHeader(requestIdHeader) || generateRequestId(),
    timestamp: Date.now(),
  };

  const userId = getHeader(userIdHeader);
  if (userId) {
    context.user = { id: userId };
  }

  const tenantId = getHeader(tenantIdHeader);
  if (tenantId) {
    context.tenant = { id: tenantId };
  }

  const sessionId = getHeader(sessionIdHeader);
  if (sessionId) {
    context.session = {
      id: sessionId,
      startedAt: Date.now(),
    };
  }

  return context;
}

/**
 * Extract context headers from the current context.
 * Useful for propagating context to downstream services.
 */
export function getContextHeaders(): Record<string, string> {
  const context = getCurrentContext();
  if (!context) {
    return {};
  }

  const headers: Record<string, string> = {
    "x-request-id": context.requestId,
  };

  if (context.user?.id) {
    headers["x-user-id"] = context.user.id;
  }

  if (context.tenant?.id) {
    headers["x-tenant-id"] = context.tenant.id;
  }

  if (context.session?.id) {
    headers["x-session-id"] = context.session.id;
  }

  return headers;
}

// ============================================================================
// Context Utilities
// ============================================================================

/**
 * Clone the current context with modifications.
 */
export function cloneContext(
  modifications?: Partial<RequestContext>,
): RequestContext | undefined {
  const context = getCurrentContext();
  if (!context) {
    return undefined;
  }

  return {
    ...context,
    ...modifications,
    runtime: context.runtime ? new Map(context.runtime) : undefined,
  };
}

/**
 * Create a resolution context from the current request context.
 */
export function createCurrentResolutionContext(
  neurolink?: DynamicResolutionContext["neurolink"],
  signal?: AbortSignal,
): DynamicResolutionContext | undefined {
  const context = getCurrentContext();
  if (!context) {
    return undefined;
  }

  return {
    requestContext: context,
    neurolink,
    signal,
  };
}

/**
 * Check if currently within a request context.
 */
export function hasContext(): boolean {
  return getCurrentContext() !== undefined;
}

/**
 * Get the current user ID or undefined.
 */
export function getCurrentUserId(): string | undefined {
  return getCurrentContext()?.user?.id;
}

/**
 * Get the current tenant ID or undefined.
 */
export function getCurrentTenantId(): string | undefined {
  return getCurrentContext()?.tenant?.id;
}

/**
 * Get the current tenant plan or undefined.
 */
export function getCurrentTenantPlan(): string | undefined {
  return getCurrentContext()?.tenant?.plan;
}

/**
 * Check if current user has a specific role.
 */
export function hasRole(role: string): boolean {
  return getCurrentContext()?.user?.roles?.includes(role) ?? false;
}

/**
 * Check if current user has a specific permission.
 */
export function hasPermission(permission: string): boolean {
  return getCurrentContext()?.user?.permissions?.includes(permission) ?? false;
}

/**
 * Check if current tenant is enterprise.
 */
export function isEnterpriseTenant(): boolean {
  return getCurrentContext()?.tenant?.plan === "enterprise";
}
