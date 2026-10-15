/**
 * Common Middleware Components
 * Reusable middleware for NeuroLink server adapters
 */

export { createAuthMiddleware } from "./auth.js";

export { createCacheMiddleware } from "./cache.js";
export { createRateLimitMiddleware } from "./rateLimit.js";
export { createSessionMiddleware } from "./session.js";
export { createRequestValidationMiddleware } from "./validation.js";
export {
  createTimingMiddleware,
  createRequestIdMiddleware,
  createErrorHandlingMiddleware,
  createSecurityHeadersMiddleware,
  createLoggingMiddleware,
  createCompressionMiddleware,
} from "./common.js";
export {
  createAbortSignalMiddleware,
  createExpressAbortMiddleware,
} from "./abortSignal.js";
export {
  createMCPBodyAttachmentMiddleware,
  fastifyMCPBodyHook,
} from "./mcpBodyAttachment.js";
export { createDeprecationMiddleware } from "./deprecation.js";
