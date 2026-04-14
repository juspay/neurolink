/**
 * Supervisor Module
 *
 * Provides supervision and oversight capabilities for agents.
 *
 * Types for this module live in src/lib/types/agentNetwork.ts and are
 * re-exported via the central barrel at src/lib/types/index.ts.
 */

export { SupervisorAgent, createSupervisedAgent } from "./supervisor-agent.js";
