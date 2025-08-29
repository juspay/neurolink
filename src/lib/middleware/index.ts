/**
 * NeuroLink Middleware System
 *
 * This module provides a comprehensive middleware system for NeuroLink that integrates
 * with the AI SDK's wrapLanguageModel functionality. It allows for modular enhancement
 * of language models with features like analytics, guardrails, caching, and more.
 */

// Import types and classes
import { MiddlewareFactory } from "./factory.js";

// Core types and interfaces
export type {
  NeuroLinkMiddleware,
  MiddlewareConfig,
  MiddlewareContext,
  MiddlewareConditions,
  MiddlewareRegistrationOptions,
  MiddlewareExecutionResult,
  MiddlewareChainStats,
  MiddlewarePreset,
  MiddlewareFactoryOptions,
  BuiltInMiddlewareType,
} from "../types/middlewareTypes.js";

// Export AI SDK middleware type
export type { LanguageModelV1Middleware } from "ai";

// Factory for creating and applying middleware chains
export { MiddlewareFactory };

// Export the factory as the default export for clean, direct usage
export default MiddlewareFactory;
