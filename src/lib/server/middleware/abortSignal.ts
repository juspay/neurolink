/**
 * Abort Signal Middleware
 * Provides client disconnection handling for long-running requests
 */

import type {
  AbortSignalMiddlewareOptions,
  MiddlewareDefinition,
  ServerContext,
} from "../../types/index.js";

/**
 * Create abort signal middleware for handling client disconnections.
 *
 * This middleware creates an AbortController and attaches its signal to the context,
 * allowing route handlers to check for client disconnection during long-running operations.
 *
 * @param options - Optional configuration
 * @returns Middleware that attaches abort signal to context
 *
 * @example
 * ```typescript
 * const abortMiddleware = createAbortSignalMiddleware();
 * server.registerMiddleware(abortMiddleware);
 *
 * // In route handler:
 * const signal = ctx.abortSignal;
 * await longRunningOperation({ signal });
 * ```
 */
export function createAbortSignalMiddleware(
  options?: AbortSignalMiddlewareOptions,
): MiddlewareDefinition {
  const { onAbort, timeout } = options ?? {};

  return {
    name: "abort-signal",
    order: 5, // Early in middleware chain

    handler: async (ctx: ServerContext, next: () => Promise<unknown>) => {
      const controller = new AbortController();
      let timeoutId: ReturnType<typeof setTimeout> | undefined;

      // Set up timeout if configured
      if (timeout && timeout > 0) {
        timeoutId = setTimeout(() => {
          controller.abort(new Error(`Request timeout after ${timeout}ms`));
        }, timeout);
      }

      // Framework-specific abort handling
      setupFrameworkAbortHandler(ctx, controller, onAbort);

      // Attach signal to context
      ctx.abortSignal = controller.signal;
      ctx.abortController = controller;

      try {
        return await next();
      } finally {
        // Clean up timeout
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    },
  };
}

/**
 * Set up framework-specific abort handling
 */
function setupFrameworkAbortHandler(
  ctx: ServerContext,
  controller: AbortController,
  onAbort?: (ctx: ServerContext) => void,
): void {
  const frameworkResponse = ctx.rawResponse;

  if (!frameworkResponse) {
    return;
  }

  // Express: res.on('close')
  if (typeof (frameworkResponse as NodeJS.EventEmitter).on === "function") {
    const res = frameworkResponse as NodeJS.WritableStream & {
      writableFinished?: boolean;
      on: (event: string, listener: () => void) => void;
    };

    res.on("close", () => {
      if (!res.writableFinished) {
        controller.abort(new Error("Client disconnected"));
        onAbort?.(ctx);
      }
    });
  }

  // Hono/Fastify: May have different event patterns
  // Add additional framework support as needed
}

/**
 * Express-specific middleware factory.
 * Use this directly with Express adapter for optimal handling.
 *
 * This is a lower-level middleware that works directly with Express
 * request/response objects rather than the unified ServerContext.
 *
 * @param options - Optional configuration
 * @returns Express middleware function
 *
 * @example
 * ```typescript
 * // In Express adapter
 * app.use(createExpressAbortMiddleware());
 *
 * // Access in route handler
 * app.get('/api/stream', (req, res) => {
 *   const signal = res.locals.abortSignal;
 *   // Use signal for cancellation
 * });
 * ```
 */
export function createExpressAbortMiddleware(
  options?: AbortSignalMiddlewareOptions,
): (
  req: unknown,
  res: {
    on: (event: string, cb: () => void) => void;
    writableFinished?: boolean;
    locals: Record<string, unknown>;
  },
  next: () => void,
) => void {
  return (
    _req: unknown,
    res: {
      on: (event: string, cb: () => void) => void;
      writableFinished?: boolean;
      locals: Record<string, unknown>;
    },
    next: () => void,
  ) => {
    const controller = new AbortController();

    res.on("close", () => {
      if (!res.writableFinished) {
        controller.abort(new Error("Client disconnected"));
        options?.onAbort?.({} as ServerContext);
      }
    });

    res.locals.abortSignal = controller.signal;
    res.locals.abortController = controller;

    next();
  };
}
