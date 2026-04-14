/**
 * Agent Evaluation Module
 *
 * Provides evaluation and optimization capabilities for agents.
 *
 * Types for this module live in src/lib/types/agentNetwork.ts and are
 * re-exported via the central barrel at src/lib/types/index.ts.
 */

export {
  AgentEvaluator,
  ResultOptimizer,
  createEvaluator,
  createOptimizer,
} from "./evaluator.js";
