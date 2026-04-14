/**
 * Agent Coordination Module
 *
 * Provides coordination and task distribution capabilities for multi-agent networks.
 *
 * Types for this module live in src/lib/types/agentNetwork.ts and are
 * re-exported via the central barrel at src/lib/types/index.ts.
 */

export { AgentCoordinator } from "./coordinator.js";
export { TaskDistributor } from "./task-distributor.js";
