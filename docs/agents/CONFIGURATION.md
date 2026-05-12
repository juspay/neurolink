# Multi-Agent Networks Configuration Guide

## Overview

This document describes all configuration options for the Multi-Agent Networks
feature in NeuroLink.

## Agent Configuration

### AgentDefinition

The core configuration for creating an agent:

```typescript
type AgentDefinition = {
  /** Unique identifier for the agent */
  id: string;

  /** Human-readable name */
  name: string;

  /** Description of capabilities (used by the router to select this agent) */
  description: string;

  /** System instructions for the agent */
  instructions: string;

  /** AI provider to use (optional, falls back to NeuroLink default) */
  provider?: AIProviderName | string;

  /** Model to use (optional, falls back to provider default) */
  model?: string;

  /** Tool names available to this agent (filters the global tool set) */
  tools?: string[];

  /** Input schema for validation (Zod schema) */
  inputSchema?: z.ZodSchema;

  /** Output schema for parsing (Zod schema) */
  outputSchema?: z.ZodSchema;

  /** Maximum steps per execution */
  maxSteps?: number;

  /** Temperature for generation */
  temperature?: number;

  /** Whether agent can delegate to others */
  canDelegate?: boolean;

  /** Custom metadata */
  metadata?: Record<string, unknown>;
};
```

### Example Agent Configurations

#### Basic Agent

```typescript
const basicAgent: AgentDefinition = {
  id: "assistant",
  name: "General Assistant",
  description: "A helpful general-purpose assistant",
  instructions: "You are a helpful assistant. Answer questions concisely.",
};
```

#### Specialized Agent with Tools

```typescript
const codeAgent: AgentDefinition = {
  id: "code-analyzer",
  name: "Code Analysis Agent",
  description: "Analyzes code for bugs, security issues, and improvements",
  instructions: `You are an expert code analyst. Examine code carefully and:
    1. Identify potential bugs
    2. Flag security vulnerabilities
    3. Suggest improvements
    4. Follow best practices`,
  provider: "anthropic",
  model: "claude-3-5-sonnet-20241022",
  tools: ["readFile", "searchCode", "lintCode"],
  maxSteps: 15,
  temperature: 0.3,
  canDelegate: false,
  metadata: {
    expertise: ["typescript", "javascript", "python"],
    analysisTypes: ["bugs", "security", "performance"],
  },
};
```

#### Agent with Schema Validation

```typescript
import { z } from "zod";

const structuredAgent: AgentDefinition = {
  id: "data-extractor",
  name: "Data Extraction Agent",
  description: "Extracts structured data from unstructured text",
  instructions:
    "Extract the requested information and return it in the specified format.",
  inputSchema: z.object({
    text: z.string().describe("Text to extract data from"),
    fields: z.array(z.string()).describe("Fields to extract"),
  }),
  outputSchema: z.object({
    extracted: z.record(z.string(), z.unknown()),
    confidence: z.number().min(0).max(1),
  }),
};
```

## Network Configuration

### AgentNetworkConfig

Configuration for creating a multi-agent network:

```typescript
type AgentNetworkConfig = {
  /** Network identifier */
  id?: string;

  /** Network name */
  name: string;

  /** Network description */
  description?: string;

  /** Agents in the network */
  agents: AgentDefinition[];

  /** Optional workflows */
  workflows?: NetworkWorkflowDefinition[];

  /** Network-level tool names */
  tools?: string[];

  /** Router configuration */
  router?: RouterConfig;

  /** Default execution options */
  defaults?: NetworkDefaults;
};
```

### RouterConfig

The router is a system prompt plus provider settings that the AI SDK uses to
select which agent tool to invoke. There is no separate `RouterAgent` class —
routing is performed by the AI SDK's built-in generate loop.

```typescript
type RouterConfig = {
  /** Provider for the routing step */
  provider?: AIProviderName | string;

  /** Model to use for the routing step */
  model?: string;

  /** Custom routing instructions (appended to the default router system prompt) */
  instructions?: string;

  /** Maximum routing attempts before the loop stops */
  maxAttempts?: number;

  /** Confidence threshold for accepting a routing decision (0-1) */
  confidenceThreshold?: number;
};
```

Example:

```typescript
const router: RouterConfig = {
  provider: "anthropic",
  model: "claude-3-5-sonnet-20241022",
  instructions: "Always prefer the specialized agent over the general one.",
  maxAttempts: 3,
  confidenceThreshold: 0.7,
};
```

### NetworkDefaults

Default settings for network execution:

```typescript
type NetworkDefaults = {
  /** Maximum steps per execution */
  maxSteps?: number;

  /** Timeout in milliseconds */
  timeout?: number;

  /** Default temperature */
  temperature?: number;
};
```

## Topology Configurations

### Hub-Spoke Topology

Central hub agent coordinates with spoke agents:

```typescript
type HubSpokeConfig = {
  /** ID of the hub agent */
  hubAgentId: string;

  /** IDs of spoke agents */
  spokeAgentIds: string[];

  /** Load balancing strategy */
  loadBalancing: "round-robin" | "least-loaded" | "random";

  /** Max concurrent tasks per spoke */
  maxConcurrentTasksPerSpoke: number;

  /** Enable failover to other spokes */
  failoverEnabled?: boolean;

  /** Enable priority-based routing */
  priorityRouting?: boolean;

  /** Health check interval in ms */
  healthCheckInterval?: number;
};
```

### Mesh Topology

All agents can communicate directly:

```typescript
type MeshConfig = {
  /** IDs of agents in the mesh */
  agentIds: string[];

  /** Auto-discover agent capabilities */
  autoDiscovery: boolean;

  /** Maximum hops for message routing */
  maxHops: number;

  /** Enable peer-to-peer delegation */
  enableP2PDelegation: boolean;

  /** Access control matrix (optional) */
  accessControl?: Record<string, string[]>;

  /** Enable audit logging */
  auditLogging?: boolean;
};
```

### Hierarchical Topology

Tree-structured agent organization:

```typescript
type HierarchicalConfig = {
  /** Root agent ID */
  rootAgentId: string;

  /** Hierarchy levels */
  levels: Array<{
    level: number;
    agents: string[];
    canDelegate?: boolean;
  }>;

  /** Allow cross-level communication */
  allowCrossLevel: boolean;

  /** Enable automatic escalation */
  autoEscalation: boolean;

  /** Escalation confidence threshold */
  escalationThreshold?: number;

  /** Maximum escalation depth */
  maxEscalationDepth?: number;
};
```

## MessageBus Configuration

### MessageBusConfig

Configuration for inter-agent messaging:

```typescript
type MessageBusConfig = {
  /** Maximum queue size */
  maxQueueSize: number;

  /** Message TTL in milliseconds */
  messageTTL: number;

  /** Enable message persistence */
  persistence: boolean;

  /** Persistence adapter */
  persistenceAdapter?: "memory" | "redis" | "file";

  /** Enable dead letter queue */
  deadLetterQueue: boolean;

  /** Delivery guarantee */
  deliveryGuarantee: "at-most-once" | "at-least-once" | "exactly-once";
};
```

### Priority Levels

```typescript
const PRIORITY_LEVELS = {
  CRITICAL: 0, // Processed immediately
  HIGH: 1, // Processed before normal
  NORMAL: 2, // Standard processing
  LOW: 3, // When capacity available
  BACKGROUND: 4, // During idle time
};
```

## Execution Options

### AgentExecutionOptions

Options for executing an agent:

```typescript
type AgentExecutionOptions = {
  /** Execution context */
  context?: Record<string, unknown>;

  /** Max steps for this execution */
  maxSteps?: number;

  /** Timeout in milliseconds */
  timeout?: number;

  /** Trace ID for correlation */
  traceId?: string;

  /** Thread ID for conversation */
  threadId?: string;

  /** Resource ID for scoping */
  resourceId?: string;
};
```

### NetworkExecutionOptions

Options for executing a network:

```typescript
type NetworkExecutionOptions = AgentExecutionOptions & {
  /** Target agent (for direct routing) */
  targetAgent?: string;

  /** Skip routing, use target directly */
  skipRouting?: boolean;

  /** Streaming callback */
  onStream?: (event: StreamEvent) => void;

  /** Progress callback */
  onProgress?: (progress: ExecutionProgress) => void;
};
```

## Environment Variables

Configure behavior via environment variables:

```bash
# Default provider for agents without explicit provider
NEUROLINK_DEFAULT_PROVIDER=vertex

# Default model
NEUROLINK_DEFAULT_MODEL=gemini-2.0-flash

# Maximum concurrent agent executions
NEUROLINK_MAX_CONCURRENT_AGENTS=10

# Default execution timeout (ms)
NEUROLINK_AGENT_TIMEOUT=30000

# Enable agent execution tracing
NEUROLINK_AGENT_TRACING=true

# MessageBus persistence
NEUROLINK_MESSAGEBUS_PERSISTENCE=memory

# Routing confidence threshold
NEUROLINK_ROUTING_THRESHOLD=0.7
```

## Configuration Best Practices

### Agent Descriptions

Write clear, detailed descriptions — they are critical for router selection:

```typescript
// Bad: too vague
description: "Handles code";

// Good: specific capabilities
description: "Analyzes source code for bugs, security vulnerabilities, " +
  "and performance issues. Supports TypeScript, JavaScript, " +
  "and Python. Can suggest fixes and refactoring improvements.";
```

### Tool Selection

Only include tools the agent actually needs:

```typescript
// Too many tools — reduces focus and adds noise
tools: ["readFile", "writeFile", "execute", "search", "analyze", "deploy"];

// Focused tool set — matches the agent's role
tools: ["readFile", "searchCode", "analyzeAST"];
```

### Temperature Settings

Match temperature to task type:

```typescript
// Analytical tasks — low temperature
temperature: 0.2;

// Creative tasks — higher temperature
temperature: 0.7;

// Default balanced
temperature: 0.5;
```

### Timeout Configuration

Set appropriate timeouts based on task complexity:

```typescript
// Simple tasks
timeout: 10000;

// Complex multi-step tasks
timeout: 60000;

// Research/comprehensive tasks
timeout: 120000;
```

## Related Documentation

- [TESTING.md](./TESTING.md) - Testing guide
- [VERIFICATION.md](./VERIFICATION.md) - Verification checklist
- [API Reference](../api/agents.md) - Full API documentation
