# Multi-Agent Networks Configuration Guide

## Overview

This document describes all configuration options for the Multi-Agent Networks feature in NeuroLink.

## Agent Configuration

### AgentDefinition

The core configuration for creating an agent:

```typescript
interface AgentDefinition {
  /** Unique identifier for the agent */
  id: string;

  /** Human-readable name */
  name: string;

  /** Description of capabilities (critical for routing) */
  description: string;

  /** System instructions for the agent */
  instructions: string;

  /** AI provider to use (optional) */
  provider?: AIProviderName | string;

  /** Model to use (optional) */
  model?: string;

  /** Tools available to this agent */
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

  /** Custom metadata for routing */
  metadata?: Record<string, unknown>;
}
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
interface AgentNetworkConfig {
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

  /** Network-level tools */
  tools?: string[];

  /** Router configuration */
  router?: RouterConfig;

  /** Default settings */
  defaults?: NetworkDefaults;
}
```

### RouterConfig

Configuration for the routing agent:

```typescript
interface RouterConfig {
  /** Routing strategy */
  type: "semantic" | "rule-based" | "hybrid" | "capability-based";

  /** Confidence threshold for routing */
  confidenceThreshold: number;

  /** Fallback agent when routing fails */
  fallbackAgent: string | null;

  /** Maximum retry attempts */
  maxRetries: number;

  /** Custom routing rules (for rule-based) */
  rules?: RoutingRule[];

  /** Use semantic fallback (for hybrid) */
  useSemanticFallback?: boolean;
}
```

### NetworkDefaults

Default settings for network execution:

```typescript
interface NetworkDefaults {
  /** Maximum concurrent tasks */
  maxConcurrentTasks: number;

  /** Task timeout in milliseconds */
  taskTimeout: number;

  /** Retry policy */
  retryPolicy: {
    maxRetries: number;
    backoffMultiplier: number;
    initialDelay: number;
  };
}
```

## Topology Configurations

### Hub-Spoke Topology

Central hub agent coordinates with spoke agents:

```typescript
interface HubSpokeConfig {
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
}
```

### Mesh Topology

All agents can communicate directly:

```typescript
interface MeshConfig {
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
}
```

### Hierarchical Topology

Tree-structured agent organization:

```typescript
interface HierarchicalConfig {
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
}
```

## MessageBus Configuration

### MessageBusConfig

Configuration for inter-agent messaging:

```typescript
interface MessageBusConfig {
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
}
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

## Routing Rules

### RoutingRule

Define pattern-based routing rules:

```typescript
interface RoutingRule {
  /** Rule identifier */
  id: string;

  /** Rule name */
  name: string;

  /** Patterns to match (regex supported) */
  patterns: string[];

  /** Keywords to match */
  keywords: string[];

  /** Target agent for matches */
  targetAgent: string;

  /** Rule priority (lower = higher priority) */
  priority: number;

  /** Confidence score for matches */
  confidence: number;
}
```

### Example Routing Rules

```typescript
const routingRules: RoutingRule[] = [
  {
    id: "code-analysis",
    name: "Code Analysis Routing",
    patterns: ["analyze.*code", "find.*bugs", "code.*review"],
    keywords: ["code", "bug", "security", "vulnerability"],
    targetAgent: "code-analyzer",
    priority: 1,
    confidence: 0.9,
  },
  {
    id: "data-processing",
    name: "Data Processing Routing",
    patterns: ["transform.*data", "parse.*csv", "convert.*json"],
    keywords: ["data", "csv", "json", "transform"],
    targetAgent: "data-processor",
    priority: 2,
    confidence: 0.85,
  },
];
```

## Execution Options

### AgentExecutionOptions

Options for executing an agent:

```typescript
interface AgentExecutionOptions {
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
}
```

### NetworkExecutionOptions

Options for executing a network:

```typescript
interface NetworkExecutionOptions extends AgentExecutionOptions {
  /** Target agent (for direct routing) */
  targetAgent?: string;

  /** Skip routing, use target directly */
  skipRouting?: boolean;

  /** Streaming callback */
  onStream?: (event: StreamEvent) => void;

  /** Progress callback */
  onProgress?: (progress: ExecutionProgress) => void;
}
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

### 1. Agent Descriptions

Write clear, detailed descriptions - they're critical for routing:

```typescript
// ❌ Bad
description: "Handles code";

// ✅ Good
description: "Analyzes source code for bugs, security vulnerabilities, " +
  "and performance issues. Supports TypeScript, JavaScript, " +
  "and Python. Can suggest fixes and refactoring improvements.";
```

### 2. Tool Selection

Only include tools the agent actually needs:

```typescript
// ❌ Too many tools
tools: ["readFile", "writeFile", "execute", "search", "analyze", "deploy", ...]

// ✅ Focused tool set
tools: ["readFile", "searchCode", "analyzeAST"]
```

### 3. Temperature Settings

Match temperature to task type:

```typescript
// Analytical tasks - low temperature
temperature: 0.2;

// Creative tasks - higher temperature
temperature: 0.7;

// Default balanced
temperature: 0.5;
```

### 4. Timeout Configuration

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
