/**
 * MCP Batching Module - Request batching for efficiency
 *
 * Provides intelligent batching of MCP tool calls:
 * - Automatic batch size management
 * - Configurable wait times
 * - Server-grouped batching
 * - Parallel batch execution
 */

export type {
  BatchConfig,
  BatchExecutor,
  BatcherEvents,
  BatchResult,
} from "./requestBatcher.js";
export {
  createRequestBatcher,
  createToolCallBatcher,
  DEFAULT_BATCH_CONFIG,
  RequestBatcher,
  ToolCallBatcher,
} from "./requestBatcher.js";
