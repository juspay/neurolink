/**
 * MCP Routing Module - Intelligent tool call routing
 *
 * Provides advanced routing strategies for multi-server MCP environments:
 * - Round-robin distribution
 * - Least-loaded selection
 * - Capability-based routing
 * - Session affinity
 */

export type {
  AffinityRule,
  CategoryMapping,
  MCPTool,
  RoutingDecision,
  RoutingStrategy,
  ServerWeight,
  ToolRouterConfig,
  ToolRouterEvents,
} from "./toolRouter.js";
export {
  createToolRouter,
  DEFAULT_ROUTER_CONFIG,
  ToolRouter,
} from "./toolRouter.js";
