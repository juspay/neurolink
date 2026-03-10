/**
 * Heartbeat Loop System
 *
 * Autonomous long-running agent execution with checkpointing and resume.
 *
 * @example Basic usage
 * ```typescript
 * import { HeartbeatLoop, TimerTrigger } from "@juspay/neurolink/agent";
 *
 * const loop = new HeartbeatLoop(neurolink, {
 *   goal: "Analyze all TypeScript files in src/",
 *   maxIterations: 100,
 *   trigger: { type: "timer", intervalMs: 0 }
 * });
 *
 * const result = await loop.run();
 * ```
 *
 * @example Resume from checkpoint
 * ```typescript
 * import { HeartbeatLoop, FileCheckpointStore } from "@juspay/neurolink/agent";
 *
 * const result = await HeartbeatLoop.resume(
 *   neurolink,
 *   "hb-a1b2c3d4",
 *   new FileCheckpointStore()
 * );
 * ```
 */

// Core loop
export { HeartbeatLoop, type HeartbeatLoopEvents } from "./heartbeatLoop.js";

// Types
export type {
  HeartbeatLoopConfig,
  LoopSnapshot,
  LoopResult,
  IterationResult,
  ContextMode,
  GoalEvaluator,
  GoalEvaluation,
  TriggerConfig,
  HITLConfig,
  SerializableLoopConfig,
  ErrorLogEntry,
  BudgetSummary,
  IterationUsage,
} from "./loopTypes.js";

// Triggers
export {
  TriggerRegistry,
  type TriggerAdapterFactory,
} from "./triggers/triggerRegistry.js";
export {
  TimerTrigger,
  type TimerTriggerConfig,
} from "./triggers/timerTrigger.js";
export type { TriggerAdapter } from "./triggers/triggerAdapter.js";

// Checkpoints
export { FileCheckpointStore } from "./checkpoints/fileCheckpoint.js";
export { InMemoryCheckpointStore } from "./checkpoints/memoryCheckpoint.js";
export {
  RedisCheckpointStore,
  type RedisCheckpointConfig,
} from "./checkpoints/redisCheckpoint.js";
export type {
  CheckpointStore,
  CheckpointListing,
} from "./checkpoints/checkpointStore.js";

// Cost tracking
export { CostTracker, BudgetExceededError } from "./costTracker.js";

// Goal evaluation
export {
  LLMGoalEvaluator,
  KeywordGoalEvaluator,
  RegexGoalEvaluator,
  CompositeGoalEvaluator,
  createGoalEvaluator,
} from "./goalEvaluator.js";

// MCP Tools
export {
  createHeartbeatTools,
  getActiveLoop,
  listActiveLoops,
  cleanupInactiveLoops,
  type MCPToolDefinition,
  type ToolResult,
} from "./heartbeatTools.js";

// MCP Server
export { startHeartbeatServer } from "./heartbeatMcpServer.js";
