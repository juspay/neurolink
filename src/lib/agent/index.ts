/**
 * Agent Module - Multi-Agent Networks for NeuroLink
 *
 * This module provides multi-agent orchestration capabilities:
 * - Agent: Individual agent with specialized instructions and tools
 * - AgentNetwork: Multi-agent orchestration using agents-as-tools pattern
 *
 * Types for this module live in src/lib/types/agentNetwork.ts and are
 * re-exported via the central barrel at src/lib/types/index.ts.
 *
 * @example Basic Usage
 * ```typescript
 * import { Agent, AgentNetwork } from '@juspay/neurolink';
 *
 * const neurolink = new NeuroLink();
 *
 * // Create a network with multiple agents
 * const network = neurolink.createNetwork({
 *   name: 'Content Team',
 *   agents: [
 *     { id: 'researcher', name: 'Researcher', description: '...', instructions: '...' },
 *     { id: 'writer', name: 'Writer', description: '...', instructions: '...' }
 *   ]
 * });
 *
 * // Execute the network
 * const result = await network.execute({
 *   message: 'Write an article about AI trends'
 * });
 * ```
 */

// Core agent classes
export { Agent } from "./agent.js";
export { AgentNetwork } from "./agentNetwork.js";

// Direct tools (existing)
export {
  directAgentTools,
  getAvailableToolNames,
  getToolsForCategory,
} from "./directTools.js";

// Routing prompts and utilities
export {
  buildConfidencePrompt,
  buildMultiStepPlanningPrompt,
  buildRoutingPrompt,
  parseRoutingResponse,
  ROUTING_PROMPTS,
} from "./prompts/routingPrompts.js";

// Coordination module
export { AgentCoordinator, TaskDistributor } from "./coordination/index.js";

// Communication module
export { MessageBus } from "./communication/index.js";

// Orchestration module
export {
  NetworkOrchestrator,
  NetworkTopology,
  TopologyBuilder,
} from "./orchestration/index.js";
