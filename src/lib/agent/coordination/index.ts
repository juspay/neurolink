/**
 * Agent Coordination Module
 *
 * Provides coordination and task distribution capabilities for multi-agent networks.
 */

export {
  AgentCoordinator,
  type CoordinationContext,
  type CoordinationResult,
  type CoordinationStrategy,
  type CoordinatorConfig,
  type TaskAssignment,
} from "./coordinator.js";

export {
  TaskDistributor,
  type AgentCapability,
  type DistributableTask,
  type DistributionResult,
  type DistributionStrategy,
  type TaskDistributorConfig,
  type TaskPriority,
} from "./task-distributor.js";
