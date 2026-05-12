/**
 * Network Orchestration Module
 *
 * Provides high-level orchestration capabilities for agent networks.
 *
 * Types for this module live in src/lib/types/agentNetwork.ts and are
 * re-exported via the central barrel at src/lib/types/index.ts.
 */

export { NetworkOrchestrator } from "./orchestrator.js";
export { NetworkTopology, TopologyBuilder } from "./topology.js";
