[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NeuroLink

# Class: NeuroLink

Defined in: [neurolink.ts:608](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L608)

## Constructors

### Constructor

> **new NeuroLink**(`config?`): `NeuroLink`

Defined in: [neurolink.ts:1253](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L1253)

#### Parameters

##### config?

[`NeurolinkConstructorConfig`](../type-aliases/NeurolinkConstructorConfig.md)

#### Returns

`NeuroLink`

## Properties

### conversationMemory?

> `optional` **conversationMemory?**: `ConversationMemoryManager` \| `RedisConversationMemoryManager` \| `null`

Defined in: [neurolink.ts:711](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L711)

## Accessors

### tasks

#### Get Signature

> **get** **tasks**(): `TaskManager`

Defined in: [neurolink.ts:1414](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L1414)

TaskManager — scheduled and self-running tasks.
Lazy-initialized on first access. Configurable via constructor `tasks` option.
The actual async initialization (Redis connect, backend start) happens
lazily inside TaskManager on first operation.

##### Returns

`TaskManager`

## Methods

### Generation

#### generate()

> **generate**(`optionsOrPrompt`): `Promise`\<[`GenerateResult`](../type-aliases/GenerateResult.md)\>

Defined in: [neurolink.ts:4245](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L4245)

Generate AI response with comprehensive feature support.

Primary method for AI generation with support for all NeuroLink features:

- Multi-provider support (14+ providers)
- MCP tool integration
- Structured JSON output with Zod schemas
- Conversation memory (Redis or in-memory)
- HITL security workflows
- Middleware execution
- Multimodal inputs (images, PDFs, CSV)

##### Parameters

###### optionsOrPrompt

`string` \| [`GenerateOptions`](../type-aliases/GenerateOptions.md) \| [`DynamicOptions`](../type-aliases/DynamicOptions.md)

Generation options or simple text prompt

`string`

---

[`GenerateOptions`](../type-aliases/GenerateOptions.md)

---

[`DynamicOptions`](../type-aliases/DynamicOptions.md)

##### Returns

`Promise`\<[`GenerateResult`](../type-aliases/GenerateResult.md)\>

Promise resolving to generation result with content and metadata

##### Examples

```typescript
const result = await neurolink.generate({
  input: { text: "Explain quantum computing" },
});
console.log(result.content);
```

```typescript
const result = await neurolink.generate({
  input: { text: "Write a poem" },
  provider: "anthropic",
  model: "claude-3-opus",
});
```

```typescript
const result = await neurolink.generate({
  input: { text: "Read README.md and summarize it" },
  tools: ["readFile"],
});
```

```typescript
import { z } from "zod";

const schema = z.object({
  name: z.string(),
  age: z.number(),
  city: z.string(),
});

const result = await neurolink.generate({
  input: { text: "Extract person info: John is 30 years old from NYC" },
  schema: schema,
});
// result.structuredData is type-safe!
```

```typescript
const result = await neurolink.generate({
  input: { text: "What did we discuss earlier?" },
  context: {
    conversationId: "conv-123",
    userId: "user-456",
  },
});
```

```typescript
const result = await neurolink.generate({
  input: {
    text: "Describe this image",
    images: ["/path/to/image.jpg"],
  },
  provider: "vertex",
});
```

##### Throws

When input text is missing or invalid

##### Throws

When all providers fail to generate content

##### Throws

When structured output validation fails

##### Throws

When HITL approval is denied

##### See

- [GenerateOptions](../type-aliases/GenerateOptions.md) for all available options
- [GenerateResult](../type-aliases/GenerateResult.md) for result structure
- [stream](#stream) for streaming generation

##### Since

1.0.0

### Other

#### getSkillsManager()

> **getSkillsManager**(): [`SkillsManager`](SkillsManager.md) \| `null`

Defined in: [neurolink.ts:2225](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L2225)

Programmatic access to the skills subsystem (search/list/get/mutations).
Returns null when skills are not configured or failed to initialize.

##### Returns

[`SkillsManager`](SkillsManager.md) \| `null`

---

#### getObservabilityConfig()

> **getObservabilityConfig**(): [`ObservabilityConfig`](../type-aliases/ObservabilityConfig.md) \| `undefined`

Defined in: [neurolink.ts:3457](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L3457)

Get observability configuration

##### Returns

[`ObservabilityConfig`](../type-aliases/ObservabilityConfig.md) \| `undefined`

---

#### isTelemetryEnabled()

> **isTelemetryEnabled**(): `boolean`

Defined in: [neurolink.ts:3465](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L3465)

Check if Langfuse telemetry is enabled
Centralized utility to avoid duplication across providers

##### Returns

`boolean`

---

#### getTelemetryStatus()

> **getTelemetryStatus**(): `object`

Defined in: [neurolink.ts:3477](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L3477)

Get comprehensive telemetry status including Langfuse, OTel, and exporter health

##### Returns

`object`

###### enabled

> **enabled**: `boolean`

###### langfuse?

> `optional` **langfuse?**: `object`

###### langfuse.enabled

> **enabled**: `boolean`

###### langfuse.baseUrl?

> `optional` **baseUrl?**: `string`

###### langfuse.environment?

> `optional` **environment?**: `string`

###### openTelemetry?

> `optional` **openTelemetry?**: `object`

###### openTelemetry.enabled

> **enabled**: `boolean`

###### openTelemetry.endpoint?

> `optional` **endpoint?**: `string`

###### openTelemetry.serviceName?

> `optional` **serviceName?**: `string`

###### exporters?

> `optional` **exporters?**: `object`[]

---

#### getMetrics()

> **getMetrics**(): [`MetricsSummary`](../type-aliases/MetricsSummary.md)

Defined in: [neurolink.ts:3532](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L3532)

Get aggregated observability metrics (latency, tokens, cost, success rate)

##### Returns

[`MetricsSummary`](../type-aliases/MetricsSummary.md)

---

#### getSpans()

> **getSpans**(): [`SpanData`](../type-aliases/SpanData.md)[]

Defined in: [neurolink.ts:3539](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L3539)

Get all recorded spans

##### Returns

[`SpanData`](../type-aliases/SpanData.md)[]

---

#### getTraces()

> **getTraces**(): [`TraceView`](../type-aliases/TraceView.md)[]

Defined in: [neurolink.ts:3546](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L3546)

Get traces (spans grouped by traceId with parent-child hierarchy)

##### Returns

[`TraceView`](../type-aliases/TraceView.md)[]

---

#### resetMetrics()

> **resetMetrics**(): `void`

Defined in: [neurolink.ts:3553](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L3553)

Reset all collected metrics and spans

##### Returns

`void`

---

#### recordMetricsSpan()

> **recordMetricsSpan**(`span`): `void`

Defined in: [neurolink.ts:3560](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L3560)

Record a span for metrics tracking

##### Parameters

###### span

[`SpanData`](../type-aliases/SpanData.md)

##### Returns

`void`

---

#### getProviderMetrics()

> **getProviderMetrics**(`options?`): `Promise`\<[`ProviderMetricsResult`](../type-aliases/ProviderMetricsResult.md)\>

Defined in: [neurolink.ts:3571](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L3571)

Get provider metrics analysis
Retrieves aggregated performance, token usage, latency, and success rates per provider.

##### Parameters

###### options?

[`ProviderMetricsOptions`](../type-aliases/ProviderMetricsOptions.md)

Filtering options

##### Returns

`Promise`\<[`ProviderMetricsResult`](../type-aliases/ProviderMetricsResult.md)\>

Comprehensive provider metrics result

---

#### getCostAnalysis()

> **getCostAnalysis**(`options?`): `Promise`\<[`CostAnalysisResult`](../type-aliases/CostAnalysisResult.md)\>

Defined in: [neurolink.ts:3586](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L3586)

Get cost analysis breakdown
Analyzes AI generation costs across requested groups and provides future projections.

##### Parameters

###### options?

[`CostAnalysisOptions`](../type-aliases/CostAnalysisOptions.md)

Cost configuration options

##### Returns

`Promise`\<[`CostAnalysisResult`](../type-aliases/CostAnalysisResult.md)\>

Detailed cost analysis breakdown

---

#### getTeamAnalytics()

> **getTeamAnalytics**(`options?`): `Promise`\<[`TeamAnalyticsResult`](../type-aliases/TeamAnalyticsResult.md)\>

Defined in: [neurolink.ts:3599](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L3599)

Get team-wide usage analytics
Retrieves request counts, unique active users, provider breakdown, and quality scoring.

##### Parameters

###### options?

[`TeamAnalyticsOptions`](../type-aliases/TeamAnalyticsOptions.md)

Team query options

##### Returns

`Promise`\<[`TeamAnalyticsResult`](../type-aliases/TeamAnalyticsResult.md)\>

Comprehensive team analytics report

---

#### initializeLangfuseObservability()

> **initializeLangfuseObservability**(): `Promise`\<`void`\>

Defined in: [neurolink.ts:3641](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L3641)

Public method to initialize Langfuse observability
This method can be called externally to ensure Langfuse is properly initialized

##### Returns

`Promise`\<`void`\>

---

#### shutdown()

> **shutdown**(): `Promise`\<`void`\>

Defined in: [neurolink.ts:3671](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L3671)

Gracefully shutdown NeuroLink and all MCP connections

##### Returns

`Promise`\<`void`\>

---

#### generateText()

> **generateText**(`options`): `Promise`\<[`TextGenerationResult`](../type-aliases/TextGenerationResult.md)\>

Defined in: [neurolink.ts:6299](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L6299)

BACKWARD COMPATIBILITY: Legacy generateText method
Internally calls generate() and converts result format

##### Parameters

###### options

[`TextGenerationOptions`](../type-aliases/TextGenerationOptions.md)

##### Returns

`Promise`\<[`TextGenerationResult`](../type-aliases/TextGenerationResult.md)\>

---

#### streamText()

> **streamText**(`prompt`, `options?`): `Promise`\<`AsyncIterable`\<`string`, `any`, `any`\>\>

Defined in: [neurolink.ts:8671](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L8671)

BACKWARD COMPATIBILITY: Legacy streamText method
Internally calls stream() and converts result format

##### Parameters

###### prompt

`string`

###### options?

`Partial`\<[`StreamOptions`](../type-aliases/StreamOptions.md)\>

##### Returns

`Promise`\<`AsyncIterable`\<`string`, `any`, `any`\>\>

---

#### stream()

> **stream**(`options`): `Promise`\<[`StreamResult`](../type-aliases/StreamResult.md)\>

Defined in: [neurolink.ts:8754](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L8754)

Stream AI-generated content in real-time using the best available provider.
This method provides real-time streaming of AI responses with full MCP tool integration.

##### Parameters

###### options

[`StreamOptions`](../type-aliases/StreamOptions.md) \| [`DynamicOptions`](../type-aliases/DynamicOptions.md)

Stream configuration options

[`StreamOptions`](../type-aliases/StreamOptions.md)

---

[`DynamicOptions`](../type-aliases/DynamicOptions.md)

##### Returns

`Promise`\<[`StreamResult`](../type-aliases/StreamResult.md)\>

Promise resolving to StreamResult with an async iterable stream

##### Example

```typescript
// Basic streaming usage
const result = await neurolink.stream({
  input: { text: "Tell me a story about space exploration" },
});

// Consume the stream
for await (const chunk of result.stream) {
  if ("content" in chunk) {
    process.stdout.write(chunk.content);
  }
}

// Advanced streaming with options
const result = await neurolink.stream({
  input: { text: "Explain machine learning" },
  provider: "openai",
  model: "gpt-4",
  temperature: 0.7,
  enableAnalytics: true,
  context: { domain: "education", audience: "beginners" },
});

// Access metadata and analytics
console.log(result.provider);
console.log(result.analytics?.usage);
```

##### Throws

When input text is missing or invalid

##### Throws

When all providers fail to generate content

##### Throws

When conversation memory operations fail (if enabled)

---

#### setToolRoutingServers()

> **setToolRoutingServers**(`servers`): `void`

Defined in: [neurolink.ts:9644](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L9644)

Supplies (or replaces) the pre-call tool routing server catalog.

For hosts that only know their tool servers after constructing NeuroLink
(e.g. tools are registered per session/conversation). Routing must still
be enabled via the constructor's `toolRouting.enabled` — setting servers
alone does not activate it.

##### Parameters

###### servers

[`ToolRoutingServerDescriptor`](../type-aliases/ToolRoutingServerDescriptor.md)[]

##### Returns

`void`

---

#### getKnowledgeStatus()

> **getKnowledgeStatus**(): [`KnowledgeEngineStatus`](../type-aliases/KnowledgeEngineStatus.md) \| `null`

Defined in: [neurolink.ts:9662](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L9662)

Knowledge-grounding engine health (null when it was not configured).

##### Returns

[`KnowledgeEngineStatus`](../type-aliases/KnowledgeEngineStatus.md) \| `null`

---

#### getEventEmitter()

> **getEventEmitter**(): `TypedEventEmitter`\<[`NeuroLinkEvents`](../type-aliases/NeuroLinkEvents.md)\>

Defined in: [neurolink.ts:12073](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L12073)

Get the EventEmitter instance to listen to NeuroLink events for real-time monitoring and debugging.
This method provides access to the internal event system that emits events during AI generation,
tool execution, streaming, and other operations for comprehensive observability.

##### Returns

`TypedEventEmitter`\<[`NeuroLinkEvents`](../type-aliases/NeuroLinkEvents.md)\>

EventEmitter instance that emits various NeuroLink operation events

##### Examples

```typescript
// Basic event listening setup
const neurolink = new NeuroLink();
const emitter = neurolink.getEventEmitter();

// Listen to generation events
emitter.on("generation:start", (event) => {
  console.log(`Generation started with provider: ${event.provider}`);
  console.log(`Started at: ${new Date(event.timestamp)}`);
});

emitter.on("generation:end", (event) => {
  console.log(`Generation completed in ${event.responseTime}ms`);
  console.log(`Tools used: ${event.toolsUsed?.length || 0}`);
});

// Listen to streaming events
emitter.on("stream:start", (event) => {
  console.log(`Streaming started with provider: ${event.provider}`);
});

emitter.on("stream:end", (event) => {
  console.log(`Streaming completed in ${event.responseTime}ms`);
  if (event.fallback) console.log("Used fallback streaming");
});

// Listen to tool execution events
emitter.on("tool:start", (event) => {
  console.log(`Tool execution started: ${event.toolName}`);
});

emitter.on("tool:end", (event) => {
  console.log(
    `Tool ${event.toolName} ${event.success ? "succeeded" : "failed"}`,
  );
  console.log(`Execution time: ${event.responseTime}ms`);
});

// Listen to tool registration events
emitter.on("tools-register:start", (event) => {
  console.log(`Registering tool: ${event.toolName}`);
});

emitter.on("tools-register:end", (event) => {
  console.log(
    `Tool registration ${event.success ? "succeeded" : "failed"}: ${event.toolName}`,
  );
});

// Listen to external MCP server events
emitter.on("externalMCP:serverConnected", (event) => {
  console.log(`External MCP server connected: ${event.serverId}`);
  console.log(`Tools available: ${event.toolCount || 0}`);
});

emitter.on("externalMCP:serverDisconnected", (event) => {
  console.log(`External MCP server disconnected: ${event.serverId}`);
  console.log(`Reason: ${event.reason || "Unknown"}`);
});

emitter.on("externalMCP:toolDiscovered", (event) => {
  console.log(`New tool discovered: ${event.toolName} from ${event.serverId}`);
});

// Advanced usage with error handling
emitter.on("error", (error) => {
  console.error("NeuroLink error:", error);
});

// Clean up event listeners when done
function cleanup() {
  emitter.removeAllListeners();
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
```

```typescript
// Advanced monitoring with metrics collection
const neurolink = new NeuroLink();
const emitter = neurolink.getEventEmitter();
const metrics = {
  generations: 0,
  totalResponseTime: 0,
  toolExecutions: 0,
  failures: 0,
};

// Collect performance metrics
emitter.on("generation:end", (event) => {
  metrics.generations++;
  metrics.totalResponseTime += event.responseTime;
  metrics.toolExecutions += event.toolsUsed?.length || 0;
});

emitter.on("tool:end", (event) => {
  if (!event.success) {
    metrics.failures++;
  }
});

// Log metrics every 10 seconds
setInterval(() => {
  const avgResponseTime =
    metrics.generations > 0
      ? metrics.totalResponseTime / metrics.generations
      : 0;

  console.log("NeuroLink Metrics:", {
    totalGenerations: metrics.generations,
    averageResponseTime: `${avgResponseTime.toFixed(2)}ms`,
    totalToolExecutions: metrics.toolExecutions,
    failureRate: `${((metrics.failures / (metrics.toolExecutions || 1)) * 100).toFixed(2)}%`,
  });
}, 10000);
```

**Available Events:**

**Generation Events:**

- `generation:start` - Fired when text generation begins
  - `{ provider: string, timestamp: number }`
- `generation:end` - Fired when text generation completes (or fails / is aborted)
  - `{ provider: string, responseTime: number, toolsUsed?: string[], timestamp: number, success?: boolean, aborted?: boolean, error?: string }`
  - `success` is `false` for both failures and client aborts; `aborted: true`
    distinguishes the latter so consumers can route cancellations
    differently from real errors. Pipeline B's metrics span maps
    `aborted: true` events to `SpanStatus.WARNING` (not ERROR).

**Streaming Events:**

- `stream:start` - Fired when streaming begins
  - `{ provider: string, timestamp: number }`
- `stream:end` - Fired when streaming completes
  - `{ provider: string, responseTime: number, fallback?: boolean }`

**Tool Events:**

- `tool:start` - Fired when tool execution begins
  - `{ toolName: string, timestamp: number }`
- `tool:end` - Fired when tool execution completes
  - `{ toolName: string, responseTime: number, success: boolean, timestamp: number }`
- `tools-register:start` - Fired when tool registration begins
  - `{ toolName: string, timestamp: number }`
- `tools-register:end` - Fired when tool registration completes
  - `{ toolName: string, success: boolean, timestamp: number }`

**External MCP Events:**

- `externalMCP:serverConnected` - Fired when external MCP server connects
  - `{ serverId: string, toolCount?: number, timestamp: number }`
- `externalMCP:serverDisconnected` - Fired when external MCP server disconnects
  - `{ serverId: string, reason?: string, timestamp: number }`
- `externalMCP:serverFailed` - Fired when external MCP server fails
  - `{ serverId: string, error: string, timestamp: number }`
- `externalMCP:toolDiscovered` - Fired when external MCP tool is discovered
  - `{ toolName: string, serverId: string, timestamp: number }`
- `externalMCP:toolRemoved` - Fired when external MCP tool is removed
  - `{ toolName: string, serverId: string, timestamp: number }`
- `externalMCP:serverAdded` - Fired when external MCP server is added
  - `{ serverId: string, config: MCPServerInfo, toolCount: number, timestamp: number }`
- `externalMCP:serverRemoved` - Fired when external MCP server is removed
  - `{ serverId: string, timestamp: number }`

**Error Events:**

- `error` - Fired when an error occurs
  - `{ error: Error, context?: object }`

##### Throws

This method does not throw errors as it returns the internal EventEmitter

##### Since

1.0.0

##### See

- [https://nodejs.org/api/events.html](https://nodejs.org/api/events.html) Node.js EventEmitter documentation
- [NeuroLink.generate](#generate) for events related to text generation
- [NeuroLink.stream](#stream) for events related to streaming
- [NeuroLink.executeTool](#executetool) for events related to tool execution

---

#### getToolDedupConfig()

> **getToolDedupConfig**(): [`ToolDedupConfig`](../type-aliases/ToolDedupConfig.md) \| `undefined`

Defined in: [neurolink.ts:12089](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L12089)

Returns the instance-level tool-dedup configuration, or `undefined` when
toolDedup was not provided at construction time.

The stored object is returned as-is whenever `toolDedup` was supplied,
including when `enabled: false` — only the complete absence of a `toolDedup`
option results in `undefined`.

Called by `BaseProvider.applyToolFiltering` so the dedup pass uses the
same config for every generate/stream call without threading an extra
parameter through the full call stack.

##### Returns

[`ToolDedupConfig`](../type-aliases/ToolDedupConfig.md) \| `undefined`

---

#### getToolsConfig()

> **getToolsConfig**(): [`ToolConfig`](../type-aliases/ToolConfig.md) \| `undefined`

Defined in: [neurolink.ts:12100](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L12100)

Returns the instance-level `tools` config (master switch, include/exclude
lists, discovery mode), or `undefined` when not provided at construction.

Called by `BaseProvider.applyToolFiltering` so the tool gate composes the
instance policy with per-call options on every generate/stream call.

##### Returns

[`ToolConfig`](../type-aliases/ToolConfig.md) \| `undefined`

---

#### getDiscoveryPins()

> **getDiscoveryPins**(`sessionKey`): `ReadonlySet`\<`string`\>

Defined in: [neurolink.ts:12111](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L12111)

Tools discovered via `search_tools` for a session (`tools.discovery`
mode). Pinned tools are sent in full on every subsequent call of that
session instead of being deferred — discovery cost is paid once.
Reading refreshes the session's recency (LRU), so active conversations
are never the ones evicted at the session cap.

##### Parameters

###### sessionKey

`string`

##### Returns

`ReadonlySet`\<`string`\>

---

#### pinDiscoveredTools()

> **pinDiscoveredTools**(`sessionKey`, `toolNames`): `void`

Defined in: [neurolink.ts:12128](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L12128)

Pin discovered tools to a session (called by the `search_tools`
meta-tool on hydration). Append-only within a session; the map is
bounded by evicting the least-recently-used session past 1000 sessions.

##### Parameters

###### sessionKey

`string`

###### toolNames

`string`[]

##### Returns

`void`

---

#### checkCredentials()

> **checkCredentials**(`input`): `Promise`\<\{ `provider`: `string`; `status`: `"network"` \| `"expired"` \| `"unknown"` \| `"ok"` \| `"missing"` \| `"denied"`; `detail`: `string`; \}\>

Defined in: [neurolink.ts:12173](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L12173)

Curator P1-1: synchronous credential health check for a single provider.

Drives a tiny real call against the provider (1-token completion or
`/models` listing depending on provider) to confirm the configured
credentials are valid. Useful at startup so a service can refuse to
boot if its primary provider's credentials are broken instead of
discovering the problem on first user request.

##### Parameters

###### input

the provider to check

###### provider

`string`

###### model?

`string`

##### Returns

`Promise`\<\{ `provider`: `string`; `status`: `"network"` \| `"expired"` \| `"unknown"` \| `"ok"` \| `"missing"` \| `"denied"`; `detail`: `string`; \}\>

`{ provider, status, detail }`. Possible status values:

- `"ok"` — credentials valid and provider reachable
- `"missing"` — required env / credentials not configured
- `"expired"` — credentials present but rejected (401/403)
- `"denied"` — credentials valid but team not whitelisted for any model
- `"network"` — provider unreachable (timeout, ECONNREFUSED, DNS)
- `"unknown"` — other error; consult `detail`

##### Example

```ts
const health = await neurolink.checkCredentials({ provider: "litellm" });
if (health.status !== "ok") {
  throw new Error(`provider not ready: ${health.detail}`);
}
```

---

#### emitToolStart()

> **emitToolStart**(`toolName`, `input`, `startTime?`): `string`

Defined in: [neurolink.ts:12252](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L12252)

Emit tool start event with execution tracking

##### Parameters

###### toolName

`string`

Name of the tool being executed

###### input

`unknown`

Input parameters for the tool

###### startTime?

`number` = `...`

Timestamp when execution started

##### Returns

`string`

executionId for tracking this specific execution

---

#### emitToolEnd()

> **emitToolEnd**(`toolName`, `result?`, `error?`, `startTime?`, `endTime?`, `executionId?`): `void`

Defined in: [neurolink.ts:12303](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L12303)

Emit tool end event with execution summary

##### Parameters

###### toolName

`string`

Name of the tool that finished

###### result?

`unknown`

Result from the tool execution

###### error?

`string`

Error message if execution failed

###### startTime?

`number`

When execution started

###### endTime?

`number` = `...`

When execution finished

###### executionId?

`string`

Optional execution ID for tracking

##### Returns

`void`

---

#### getCurrentToolExecutions()

> **getCurrentToolExecutions**(): [`ToolExecutionContext`](../type-aliases/ToolExecutionContext.md)[]

Defined in: [neurolink.ts:12384](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L12384)

Get current tool execution contexts for stream metadata

##### Returns

[`ToolExecutionContext`](../type-aliases/ToolExecutionContext.md)[]

---

#### getToolExecutionHistory()

> **getToolExecutionHistory**(): [`ToolExecutionSummary`](../type-aliases/ToolExecutionSummary.md)[]

Defined in: [neurolink.ts:12391](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L12391)

Get tool execution history

##### Returns

[`ToolExecutionSummary`](../type-aliases/ToolExecutionSummary.md)[]

---

#### clearCurrentStreamExecutions()

> **clearCurrentStreamExecutions**(): `void`

Defined in: [neurolink.ts:12398](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L12398)

Clear current stream tool executions (called at stream start)

##### Returns

`void`

---

#### registerTool()

> **registerTool**(`name`, `tool`, `options?`): `void`

Defined in: [neurolink.ts:12414](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L12414)

Register a custom tool that will be available to all AI providers

##### Parameters

###### name

`string`

Unique name for the tool

###### tool

Tool in MCPExecutableTool format (unified MCP protocol type)

###### name

`string`

###### description

`string`

###### inputSchema?

`object`

###### execute?

(`params`, `context?`) => `unknown`

###### options?

[`ToolRegistrationOptions`](../type-aliases/ToolRegistrationOptions.md)

##### Returns

`void`

---

#### setToolContext()

> **setToolContext**(`context`): `void`

Defined in: [neurolink.ts:12555](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L12555)

Set the context that will be passed to tools during execution
This context will be merged with any runtime context passed by the AI model

##### Parameters

###### context

`Record`\<`string`, `unknown`\>

Context object containing session info, tokens, shop data, etc.

##### Returns

`void`

---

#### getToolContext()

> **getToolContext**(): `Record`\<`string`, `unknown`\> \| `undefined`

Defined in: [neurolink.ts:12570](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L12570)

Get the current tool execution context

##### Returns

`Record`\<`string`, `unknown`\> \| `undefined`

Current context or undefined if not set

---

#### clearToolContext()

> **clearToolContext**(): `void`

Defined in: [neurolink.ts:12579](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L12579)

Clear the tool execution context

##### Returns

`void`

---

#### registerTools()

> **registerTools**(`tools`): `void`

Defined in: [neurolink.ts:12591](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L12591)

Register multiple tools at once - Supports both object and array formats

##### Parameters

###### tools

`Record`\<`string`, \{ `name`: `string`; `description`: `string`; `inputSchema?`: `object`; `execute?`: (`params`, `context?`) => `unknown`; \}\> \| `object`[]

Object mapping tool names to MCPExecutableTool format OR Array of tools with names

Object format (existing): { toolName: MCPExecutableTool, ... }
Array format (Lighthouse compatible): [{ name: string, tool: MCPExecutableTool }, ...]

##### Returns

`void`

---

#### unregisterTool()

> **unregisterTool**(`name`): `boolean`

Defined in: [neurolink.ts:12614](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L12614)

Unregister a custom tool

##### Parameters

###### name

`string`

Name of the tool to remove

##### Returns

`boolean`

true if the tool was removed, false if it didn't exist

---

#### useToolMiddleware()

> **useToolMiddleware**(`middleware`): `this`

Defined in: [neurolink.ts:12632](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L12632)

Register a global tool middleware that runs on every tool execution.
Middleware receives the tool, params, context, and a next() function.

##### Parameters

###### middleware

[`ToolMiddleware`](../type-aliases/ToolMiddleware.md)

The middleware function to register

##### Returns

`this`

this (for chaining)

---

#### getToolMiddlewares()

> **getToolMiddlewares**(): [`ToolMiddleware`](../type-aliases/ToolMiddleware.md)[]

Defined in: [neurolink.ts:12645](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L12645)

Get all registered tool middlewares

##### Returns

[`ToolMiddleware`](../type-aliases/ToolMiddleware.md)[]

---

#### flushToolBatch()

> **flushToolBatch**(): `Promise`\<`void`\>

Defined in: [neurolink.ts:12652](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L12652)

Flush any pending batched tool calls immediately

##### Returns

`Promise`\<`void`\>

---

#### getMCPEnhancementsConfig()

> **getMCPEnhancementsConfig**(): [`MCPEnhancementsConfig`](../type-aliases/MCPEnhancementsConfig.md) \| `undefined`

Defined in: [neurolink.ts:12661](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L12661)

Get the current MCP enhancements configuration

##### Returns

[`MCPEnhancementsConfig`](../type-aliases/MCPEnhancementsConfig.md) \| `undefined`

---

#### updateAgenticLoopReport()

> **updateAgenticLoopReport**(`sessionId`, `report`, `userId?`): `Promise`\<`void`\>

Defined in: [neurolink.ts:12684](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L12684)

Update agentic loop report metadata for a conversation session.
Upserts a report entry by reportId — updates existing or adds new.
Only supported when using Redis conversation memory.

##### Parameters

###### sessionId

`string`

The session identifier

###### report

[`AgenticLoopReportMetadata`](../type-aliases/AgenticLoopReportMetadata.md)

The agentic loop report metadata to upsert

###### userId?

`string`

Optional user identifier

##### Returns

`Promise`\<`void`\>

##### Throws

Error if conversation memory is not initialized or is not Redis-backed

##### Example

```typescript
await neurolink.updateAgenticLoopReport("session-123", {
  reportId: "report-abc",
  reportType: "META",
  reportStatus: "INPROGRESS",
});
```

---

#### getCustomTools()

> **getCustomTools**(): `Map`\<`string`, \{ `name`: `string`; `description`: `string`; `inputSchema?`: `object`; `execute?`: (`params`, `context?`) => `unknown`; \}\>

Defined in: [neurolink.ts:12720](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L12720)

Get all registered custom tools

##### Returns

`Map`\<`string`, \{ `name`: `string`; `description`: `string`; `inputSchema?`: `object`; `execute?`: (`params`, `context?`) => `unknown`; \}\>

Map of tool names to MCPExecutableTool format

---

#### addInMemoryMCPServer()

> **addInMemoryMCPServer**(`serverId`, `serverInfo`): `Promise`\<`void`\>

Defined in: [neurolink.ts:12858](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L12858)

Add an in-memory MCP server (from git diff)
Allows registration of pre-instantiated server objects

##### Parameters

###### serverId

`string`

Unique identifier for the server

###### serverInfo

[`MCPServerInfo`](../type-aliases/MCPServerInfo.md)

Server configuration

##### Returns

`Promise`\<`void`\>

---

#### getInMemoryServers()

> **getInMemoryServers**(): `Map`\<`string`, [`MCPServerInfo`](../type-aliases/MCPServerInfo.md)\>

Defined in: [neurolink.ts:12902](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L12902)

Get all registered in-memory servers as a Map for ID-based lookup.

This method is primarily used when you need O(1) lookup by server ID,
such as in `testMCPServer()` for checking if a specific server exists.

##### Returns

`Map`\<`string`, [`MCPServerInfo`](../type-aliases/MCPServerInfo.md)\>

Map of server IDs to MCPServerInfo

##### See

[getInMemoryServerInfos](#getinmemoryserverinfos) for array-based access (useful for iteration/spreading)

---

#### getInMemoryServerInfos()

> **getInMemoryServerInfos**(): [`MCPServerInfo`](../type-aliases/MCPServerInfo.md)[]

Defined in: [neurolink.ts:12929](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L12929)

Get in-memory servers as an array of MCPServerInfo.

This method is the canonical source for in-memory server filtering.
It fetches from the centralized tool registry and filters servers
with the "in-memory" category.

Use this method when you need to:

- Iterate over all in-memory servers
- Spread servers into another array (e.g., in `listMCPServers()`)
- Get a count of in-memory servers

##### Returns

[`MCPServerInfo`](../type-aliases/MCPServerInfo.md)[]

Array of MCPServerInfo for in-memory servers

##### See

[getInMemoryServers](#getinmemoryservers) for Map-based access (useful for ID lookups)

---

#### getAutoDiscoveredServerInfos()

> **getAutoDiscoveredServerInfos**(): [`MCPServerInfo`](../type-aliases/MCPServerInfo.md)[]

Defined in: [neurolink.ts:12945](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L12945)

Get auto-discovered servers as MCPServerInfo - ZERO conversion needed

##### Returns

[`MCPServerInfo`](../type-aliases/MCPServerInfo.md)[]

Array of MCPServerInfo

---

#### executeTool()

> **executeTool**\<`T`\>(`toolName`, `params?`, `options?`): `Promise`\<`T`\>

Defined in: [neurolink.ts:12957](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L12957)

Execute a specific tool by name with robust error handling
Supports both custom tools and MCP server tools with timeout, retry, and circuit breaker patterns

##### Type Parameters

###### T

`T` = `unknown`

##### Parameters

###### toolName

`string`

Name of the tool to execute

###### params?

`unknown` = `{}`

Parameters to pass to the tool

###### options?

Execution options including optional authentication context

###### timeout?

`number`

###### maxRetries?

`number`

###### retryDelayMs?

`number`

###### disableToolCache?

`boolean`

Disable tool result caching for this call

###### bypassBatcher?

`boolean`

Bypass the request batcher for this call

###### authContext?

\{\[`key`: `string`\]: `unknown`; `userId?`: `string`; `sessionId?`: `string`; `user?`: `Record`\<`string`, `unknown`\>; \}

###### authContext.userId?

`string`

###### authContext.sessionId?

`string`

###### authContext.user?

`Record`\<`string`, `unknown`\>

##### Returns

`Promise`\<`T`\>

Tool execution result

---

#### getAllAvailableTools()

> **getAllAvailableTools**(): `Promise`\<[`ToolInfo`](../type-aliases/ToolInfo.md)[]\>

Defined in: [neurolink.ts:13961](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L13961)

##### Returns

`Promise`\<[`ToolInfo`](../type-aliases/ToolInfo.md)[]\>

---

#### getProviderStatus()

> **getProviderStatus**(`options?`): `Promise`\<[`ProviderStatus`](../type-aliases/ProviderStatus.md)[]\>

Defined in: [neurolink.ts:14143](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L14143)

Get comprehensive status of all AI providers
Primary method for provider health checking and diagnostics

##### Parameters

###### options?

###### quiet?

`boolean`

##### Returns

`Promise`\<[`ProviderStatus`](../type-aliases/ProviderStatus.md)[]\>

---

#### testProvider()

> **testProvider**(`providerName`): `Promise`\<`boolean`\>

Defined in: [neurolink.ts:14324](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L14324)

Test a specific AI provider's connectivity and authentication

##### Parameters

###### providerName

`string`

Name of the provider to test

##### Returns

`Promise`\<`boolean`\>

Promise resolving to true if provider is working

---

#### getBestProvider()

> **getBestProvider**(`requestedProvider?`): `Promise`\<`string`\>

Defined in: [neurolink.ts:14356](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L14356)

Get the best available AI provider based on configuration and availability

##### Parameters

###### requestedProvider?

`string`

Optional preferred provider name

##### Returns

`Promise`\<`string`\>

Promise resolving to the best provider name

---

#### getAvailableProviders()

> **getAvailableProviders**(): `Promise`\<`string`[]\>

Defined in: [neurolink.ts:14365](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L14365)

Get list of all available AI provider names

##### Returns

`Promise`\<`string`[]\>

Array of supported provider names

---

#### isValidProvider()

> **isValidProvider**(`providerName`): `Promise`\<`boolean`\>

Defined in: [neurolink.ts:14375](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L14375)

Validate if a provider name is supported

##### Parameters

###### providerName

`string`

Provider name to validate

##### Returns

`Promise`\<`boolean`\>

True if provider name is valid

---

#### getMCPStatus()

> **getMCPStatus**(): `Promise`\<[`MCPStatus`](../type-aliases/MCPStatus.md)\>

Defined in: [neurolink.ts:14388](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L14388)

Get comprehensive MCP (Model Context Protocol) status information

##### Returns

`Promise`\<[`MCPStatus`](../type-aliases/MCPStatus.md)\>

Promise resolving to MCP status details

---

#### listMCPServers()

> **listMCPServers**(): `Promise`\<[`MCPServerInfo`](../type-aliases/MCPServerInfo.md)[]\>

Defined in: [neurolink.ts:14458](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L14458)

List all configured MCP servers with their status

##### Returns

`Promise`\<[`MCPServerInfo`](../type-aliases/MCPServerInfo.md)[]\>

Promise resolving to array of MCP server information

---

#### testMCPServer()

> **testMCPServer**(`serverId`): `Promise`\<`boolean`\>

Defined in: [neurolink.ts:14473](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L14473)

Test connectivity to a specific MCP server

##### Parameters

###### serverId

`string`

ID of the MCP server to test

##### Returns

`Promise`\<`boolean`\>

Promise resolving to true if server is reachable

---

#### hasProviderEnvVars()

> **hasProviderEnvVars**(`providerName`): `Promise`\<`boolean`\>

Defined in: [neurolink.ts:14514](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L14514)

Check if a provider has the required environment variables configured

##### Parameters

###### providerName

`string`

Name of the provider to check

##### Returns

`Promise`\<`boolean`\>

Promise resolving to true if provider has required env vars

---

#### checkProviderHealth()

> **checkProviderHealth**(`providerName`, `options?`): `Promise`\<\{ `provider`: `string`; `isHealthy`: `boolean`; `isConfigured`: `boolean`; `hasApiKey`: `boolean`; `lastChecked`: `Date`; `error?`: `string`; `warning?`: `string`; `responseTime?`: `number`; `configurationIssues`: `string`[]; `recommendations`: `string`[]; \}\>

Defined in: [neurolink.ts:14540](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L14540)

Perform comprehensive health check on a specific provider

##### Parameters

###### providerName

`string`

Name of the provider to check

###### options?

Health check options

###### timeout?

`number`

###### includeConnectivityTest?

`boolean`

###### includeModelValidation?

`boolean`

###### cacheResults?

`boolean`

##### Returns

`Promise`\<\{ `provider`: `string`; `isHealthy`: `boolean`; `isConfigured`: `boolean`; `hasApiKey`: `boolean`; `lastChecked`: `Date`; `error?`: `string`; `warning?`: `string`; `responseTime?`: `number`; `configurationIssues`: `string`[]; `recommendations`: `string`[]; \}\>

Promise resolving to detailed health status

---

#### checkAllProvidersHealth()

> **checkAllProvidersHealth**(`options?`): `Promise`\<`object`[]\>

Defined in: [neurolink.ts:14586](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L14586)

Check health of all supported providers

##### Parameters

###### options?

Health check options

###### timeout?

`number`

###### includeConnectivityTest?

`boolean`

###### includeModelValidation?

`boolean`

###### cacheResults?

`boolean`

##### Returns

`Promise`\<`object`[]\>

Promise resolving to array of health statuses for all providers

---

#### getProviderHealthSummary()

> **getProviderHealthSummary**(): `Promise`\<\{ `total`: `number`; `healthy`: `number`; `configured`: `number`; `hasIssues`: `number`; `healthyProviders`: `string`[]; `unhealthyProviders`: `string`[]; `recommendations`: `string`[]; \}\>

Defined in: [neurolink.ts:14630](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L14630)

Get a summary of provider health across all supported providers

##### Returns

`Promise`\<\{ `total`: `number`; `healthy`: `number`; `configured`: `number`; `hasIssues`: `number`; `healthyProviders`: `string`[]; `unhealthyProviders`: `string`[]; `recommendations`: `string`[]; \}\>

Promise resolving to health summary statistics

---

#### clearProviderHealthCache()

> **clearProviderHealthCache**(`providerName?`): `Promise`\<`void`\>

Defined in: [neurolink.ts:14677](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L14677)

Clear provider health cache (useful for re-testing after configuration changes)

##### Parameters

###### providerName?

`string`

Optional specific provider to clear cache for

##### Returns

`Promise`\<`void`\>

---

#### getToolExecutionMetrics()

> **getToolExecutionMetrics**(): `Record`\<`string`, \{ `totalExecutions`: `number`; `successfulExecutions`: `number`; `failedExecutions`: `number`; `successRate`: `number`; `averageExecutionTime`: `number`; `lastExecutionTime`: `number`; `errorCategories`: `Record`\<`string`, `number`\>; \}\>

Defined in: [neurolink.ts:14688](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L14688)

Get execution metrics for all tools

##### Returns

`Record`\<`string`, \{ `totalExecutions`: `number`; `successfulExecutions`: `number`; `failedExecutions`: `number`; `successRate`: `number`; `averageExecutionTime`: `number`; `lastExecutionTime`: `number`; `errorCategories`: `Record`\<`string`, `number`\>; \}\>

Object with execution metrics for each tool

---

#### setModelAliasConfig()

> **setModelAliasConfig**(`config`): `void`

Defined in: [neurolink.ts:14732](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L14732)

NL-004: Set model alias/deprecation configuration.
Models in the alias map will be warned, redirected, or blocked based on their action.

##### Parameters

###### config

[`ModelAliasConfig`](../type-aliases/ModelAliasConfig.md)

Model alias configuration with aliases map

##### Returns

`void`

---

#### getToolCircuitBreakerStatus()

> **getToolCircuitBreakerStatus**(): `Record`\<`string`, \{ `state`: `"closed"` \| `"open"` \| `"half-open"`; `failureCount`: `number`; `isHealthy`: `boolean`; \}\>

Defined in: [neurolink.ts:14745](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L14745)

Get circuit breaker status for all tools

##### Returns

`Record`\<`string`, \{ `state`: `"closed"` \| `"open"` \| `"half-open"`; `failureCount`: `number`; `isHealthy`: `boolean`; \}\>

Object with circuit breaker status for each tool

---

#### resetToolCircuitBreaker()

> **resetToolCircuitBreaker**(`toolName`): `void`

Defined in: [neurolink.ts:14780](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L14780)

Reset circuit breaker for a specific tool

##### Parameters

###### toolName

`string`

Name of the tool to reset circuit breaker for

##### Returns

`void`

---

#### clearToolExecutionMetrics()

> **clearToolExecutionMetrics**(): `void`

Defined in: [neurolink.ts:14797](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L14797)

Clear all tool execution metrics

##### Returns

`void`

---

#### getToolHealthReport()

> **getToolHealthReport**(): `Promise`\<\{ `totalTools`: `number`; `healthyTools`: `number`; `unhealthyTools`: `number`; `tools`: `Record`\<`string`, \{ `name`: `string`; `isHealthy`: `boolean`; `metrics`: \{ `totalExecutions`: `number`; `successRate`: `number`; `averageExecutionTime`: `number`; `lastExecutionTime`: `number`; `errorCategories`: `Record`\<`string`, `number`\>; \}; `circuitBreaker`: \{ `state`: `"closed"` \| `"open"` \| `"half-open"`; `failureCount`: `number`; \}; `issues`: `string`[]; `recommendations`: `string`[]; \}\>; \}\>

Defined in: [neurolink.ts:14806](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L14806)

Get comprehensive tool health report

##### Returns

`Promise`\<\{ `totalTools`: `number`; `healthyTools`: `number`; `unhealthyTools`: `number`; `tools`: `Record`\<`string`, \{ `name`: `string`; `isHealthy`: `boolean`; `metrics`: \{ `totalExecutions`: `number`; `successRate`: `number`; `averageExecutionTime`: `number`; `lastExecutionTime`: `number`; `errorCategories`: `Record`\<`string`, `number`\>; \}; `circuitBreaker`: \{ `state`: `"closed"` \| `"open"` \| `"half-open"`; `failureCount`: `number`; \}; `issues`: `string`[]; `recommendations`: `string`[]; \}\>; \}\>

Detailed health report for all tools

---

#### ensureConversationMemoryInitialized()

> **ensureConversationMemoryInitialized**(): `Promise`\<`boolean`\>

Defined in: [neurolink.ts:14961](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L14961)

Initialize conversation memory if enabled (public method for explicit initialization)
This is useful for testing or when you want to ensure conversation memory is ready

##### Returns

`Promise`\<`boolean`\>

Promise resolving to true if initialization was successful, false otherwise

---

#### getConversationStats()

> **getConversationStats**(): `Promise`\<[`ConversationMemoryStats`](../type-aliases/ConversationMemoryStats.md)\>

Defined in: [neurolink.ts:14981](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L14981)

Get conversation memory statistics (public API)

##### Returns

`Promise`\<[`ConversationMemoryStats`](../type-aliases/ConversationMemoryStats.md)\>

---

#### getConversationHistory()

> **getConversationHistory**(`sessionId`): `Promise`\<[`ChatMessage`](../type-aliases/ChatMessage.md)[]\>

Defined in: [neurolink.ts:15008](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L15008)

Get complete conversation history for a specific session (public API)

##### Parameters

###### sessionId

`string`

The session ID to retrieve history for

##### Returns

`Promise`\<[`ChatMessage`](../type-aliases/ChatMessage.md)[]\>

Array of ChatMessage objects in chronological order, or empty array if session doesn't exist

---

#### clearConversationSession()

> **clearConversationSession**(`sessionId`): `Promise`\<`boolean`\>

Defined in: [neurolink.ts:15064](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L15064)

Clear conversation history for a specific session (public API)

##### Parameters

###### sessionId

`string`

##### Returns

`Promise`\<`boolean`\>

---

#### clearAllConversations()

> **clearAllConversations**(): `Promise`\<`void`\>

Defined in: [neurolink.ts:15090](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L15090)

Clear all conversation history (public API)

##### Returns

`Promise`\<`void`\>

---

#### listSessions()

> **listSessions**(`userId?`): `Promise`\<[`SessionListItem`](../type-aliases/SessionListItem.md)[]\>

Defined in: [neurolink.ts:15118](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L15118)

List all conversation sessions with metadata (public API)

##### Parameters

###### userId?

`string`

Optional user ID to filter sessions (required for Redis storage)

##### Returns

`Promise`\<[`SessionListItem`](../type-aliases/SessionListItem.md)[]\>

Array of session list items with metadata

---

#### exportSession()

> **exportSession**(`sessionId`, `options?`): `Promise`\<[`SessionExport`](../type-aliases/SessionExport.md) \| `null`\>

Defined in: [neurolink.ts:15167](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L15167)

Export a single session with full history and metadata (public API)

##### Parameters

###### sessionId

`string`

The session ID to export

###### options?

Export options

###### includeMetadata?

`boolean`

###### format?

`"json"` \| `"csv"`

##### Returns

`Promise`\<[`SessionExport`](../type-aliases/SessionExport.md) \| `null`\>

Session export object with full history

---

#### exportAllSessions()

> **exportAllSessions**(`userId?`, `options?`): `Promise`\<[`SessionExport`](../type-aliases/SessionExport.md)[]\>

Defined in: [neurolink.ts:15252](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L15252)

Export all sessions for a user (public API)

##### Parameters

###### userId?

`string`

Optional user ID (required for Redis storage)

###### options?

Export options

###### includeMetadata?

`boolean`

###### format?

`"json"` \| `"csv"`

##### Returns

`Promise`\<[`SessionExport`](../type-aliases/SessionExport.md)[]\>

Array of session exports

---

#### storeToolExecutions()

> **storeToolExecutions**(`sessionId`, `userId`, `toolCalls`, `toolResults`, `currentTime?`): `Promise`\<`void`\>

Defined in: [neurolink.ts:15316](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L15316)

Store tool executions in conversation memory if enabled and Redis is configured

##### Parameters

###### sessionId

`string`

Session identifier

###### userId

`string` \| `undefined`

User identifier (optional)

###### toolCalls

`object`[]

Array of tool calls

###### toolResults

`object`[]

Array of tool results

###### currentTime?

`Date`

Date when the tool execution occurred (optional)

##### Returns

`Promise`\<`void`\>

Promise resolving when storage is complete

---

#### isToolExecutionStorageAvailable()

> **isToolExecutionStorageAvailable**(): `boolean`

Defined in: [neurolink.ts:15386](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L15386)

Check if tool execution storage is available.

Now capability-based rather than Redis-specific: any configured memory
backend implementing `storeToolExecution` qualifies. The old check
required `STORAGE_TYPE === "redis"` AND a Redis manager by class name, so
in-memory sessions reported false and silently skipped tool persistence.

##### Returns

`boolean`

whether the active memory backend can persist tool executions

---

#### getSessionMessages()

> **getSessionMessages**(`sessionId`, `userId?`): `Promise`\<[`ChatMessage`](../type-aliases/ChatMessage.md)[]\>

Defined in: [neurolink.ts:15396](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L15396)

Get the raw messages array for a session.
Returns the full messages list without context filtering or summarization.

##### Parameters

###### sessionId

`string`

The session ID to retrieve messages for

###### userId?

`string`

##### Returns

`Promise`\<[`ChatMessage`](../type-aliases/ChatMessage.md)[]\>

Array of ChatMessage objects, or empty array if session doesn't exist

---

#### setSessionMessages()

> **setSessionMessages**(`sessionId`, `messages`, `userId?`): `Promise`\<`void`\>

Defined in: [neurolink.ts:15437](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L15437)

Replace the entire messages array for a session.

##### Parameters

###### sessionId

`string`

The session ID to update

###### messages

[`ChatMessage`](../type-aliases/ChatMessage.md)[]

The new messages array

###### userId?

`string`

Optional user ID for scoped Redis key lookup

##### Returns

`Promise`\<`void`\>

---

#### modifyLastAssistantMessage()

> **modifyLastAssistantMessage**(`sessionId`, `transformer`, `userId?`): `Promise`\<`boolean`\>

Defined in: [neurolink.ts:15485](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L15485)

Modify the last assistant message in a session using a transformer function.
Convenience wrapper around getSessionMessages/setSessionMessages.

##### Parameters

###### sessionId

`string`

The session ID to modify

###### transformer

(`content`) => `string`

Function that receives the last assistant message content and returns the modified content

###### userId?

`string`

Optional user ID for scoped Redis key lookup

##### Returns

`Promise`\<`boolean`\>

true if a message was modified, false if no assistant message was found

---

#### addExternalMCPServer()

> **addExternalMCPServer**(`serverId`, `config`): `Promise`\<[`ExternalMCPOperationResult`](../type-aliases/ExternalMCPOperationResult.md)\<[`ExternalMCPServerInstance`](../type-aliases/ExternalMCPServerInstance.md)\>\>

Defined in: [neurolink.ts:15516](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L15516)

Add an external MCP server
Automatically discovers and registers tools from the server

##### Parameters

###### serverId

`string`

Unique identifier for the server

###### config

[`MCPServerInfo`](../type-aliases/MCPServerInfo.md)

External MCP server configuration

##### Returns

`Promise`\<[`ExternalMCPOperationResult`](../type-aliases/ExternalMCPOperationResult.md)\<[`ExternalMCPServerInstance`](../type-aliases/ExternalMCPServerInstance.md)\>\>

Operation result with server instance

---

#### removeExternalMCPServer()

> **removeExternalMCPServer**(`serverId`): `Promise`\<[`ExternalMCPOperationResult`](../type-aliases/ExternalMCPOperationResult.md)\<`void`\>\>

Defined in: [neurolink.ts:15603](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L15603)

Remove an external MCP server
Stops the server and removes all its tools

##### Parameters

###### serverId

`string`

ID of the server to remove

##### Returns

`Promise`\<[`ExternalMCPOperationResult`](../type-aliases/ExternalMCPOperationResult.md)\<`void`\>\>

Operation result

---

#### listExternalMCPServers()

> **listExternalMCPServers**(): `object`[]

Defined in: [neurolink.ts:15655](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L15655)

List all external MCP servers

##### Returns

`object`[]

Array of server health information

---

#### getExternalMCPServer()

> **getExternalMCPServer**(`serverId`): [`ExternalMCPServerInstance`](../type-aliases/ExternalMCPServerInstance.md) \| `undefined`

Defined in: [neurolink.ts:15684](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L15684)

Get external MCP server status

##### Parameters

###### serverId

`string`

ID of the server

##### Returns

[`ExternalMCPServerInstance`](../type-aliases/ExternalMCPServerInstance.md) \| `undefined`

Server instance or undefined if not found

---

#### executeExternalMCPTool()

> **executeExternalMCPTool**(`serverId`, `toolName`, `parameters`, `options?`): `Promise`\<`unknown`\>

Defined in: [neurolink.ts:15698](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L15698)

Execute a tool from an external MCP server

##### Parameters

###### serverId

`string`

ID of the server

###### toolName

`string`

Name of the tool

###### parameters

[`JsonObject`](../type-aliases/JsonObject.md)

Tool parameters

###### options?

Execution options

###### timeout?

`number`

##### Returns

`Promise`\<`unknown`\>

Tool execution result

---

#### getExternalMCPTools()

> **getExternalMCPTools**(): [`ExternalMCPToolInfo`](../type-aliases/ExternalMCPToolInfo.md)[]

Defined in: [neurolink.ts:15795](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L15795)

Get all tools from external MCP servers

##### Returns

[`ExternalMCPToolInfo`](../type-aliases/ExternalMCPToolInfo.md)[]

Array of external tool information

---

#### getExternalMCPServerTools()

> **getExternalMCPServerTools**(`serverId`): [`ExternalMCPToolInfo`](../type-aliases/ExternalMCPToolInfo.md)[]

Defined in: [neurolink.ts:15804](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L15804)

Get tools from a specific external MCP server

##### Parameters

###### serverId

`string`

ID of the server

##### Returns

[`ExternalMCPToolInfo`](../type-aliases/ExternalMCPToolInfo.md)[]

Array of tool information for the server

---

#### testExternalMCPConnection()

> **testExternalMCPConnection**(`config`): `Promise`\<[`BatchOperationResult`](../type-aliases/BatchOperationResult.md)\>

Defined in: [neurolink.ts:15813](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L15813)

Test connection to an external MCP server

##### Parameters

###### config

[`MCPServerInfo`](../type-aliases/MCPServerInfo.md)

Server configuration to test

##### Returns

`Promise`\<[`BatchOperationResult`](../type-aliases/BatchOperationResult.md)\>

Test result with connection status

---

#### getExternalMCPStatistics()

> **getExternalMCPStatistics**(): `object`

Defined in: [neurolink.ts:15841](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L15841)

Get external MCP server manager statistics

##### Returns

`object`

Statistics about external servers and tools

###### totalServers

> **totalServers**: `number`

###### connectedServers

> **connectedServers**: `number`

###### failedServers

> **failedServers**: `number`

###### totalTools

> **totalTools**: `number`

###### totalConnections

> **totalConnections**: `number`

###### totalErrors

> **totalErrors**: `number`

---

#### shutdownExternalMCPServers()

> **shutdownExternalMCPServers**(): `Promise`\<`void`\>

Defined in: [neurolink.ts:15856](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L15856)

Shutdown all external MCP servers
Called automatically on process exit

##### Returns

`Promise`\<`void`\>

---

#### getElicitationManager()

> **getElicitationManager**(): `Promise`\<`any`\>

Defined in: [neurolink.ts:15894](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L15894)

Get the global elicitation manager for interactive tool input
Elicitation allows tools to request additional information from users during execution

##### Returns

`Promise`\<`any`\>

The global ElicitationManager instance

##### Example

```typescript
const elicitationManager = neurolink.getElicitationManager();

// Register a handler for confirmations
elicitationManager.registerHandler(async (request) => {
  if (request.type === "confirmation") {
    const answer = await askUser(request.message);
    return { confirmed: answer === "yes" };
  }
});
```

---

#### registerElicitationHandler()

> **registerElicitationHandler**(`handler`): `Promise`\<`void`\>

Defined in: [neurolink.ts:15922](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L15922)

Register an elicitation handler for interactive tool input
Handlers are called when tools need user input during execution

##### Parameters

###### handler

(`request`) => `Promise`\<`unknown`\>

Function to handle elicitation requests

##### Returns

`Promise`\<`void`\>

##### Example

```typescript
neurolink.registerElicitationHandler(async (request) => {
  switch (request.type) {
    case "confirmation":
      return { confirmed: await confirmWithUser(request.message) };
    case "text":
      return { value: await promptUser(request.message) };
    case "select":
      return { value: await selectFromOptions(request.options) };
  }
});
```

---

#### getMultiServerManager()

> **getMultiServerManager**(): `Promise`\<`any`\>

Defined in: [neurolink.ts:15945](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L15945)

Get the multi-server manager for load balancing and coordination
Allows managing multiple MCP servers with failover and load balancing

##### Returns

`Promise`\<`any`\>

The global MultiServerManager instance

##### Example

```typescript
const multiServer = neurolink.getMultiServerManager();

// Create a server group with load balancing
await multiServer.createServerGroup("ai-tools", {
  servers: ["openai-server", "anthropic-server"],
  strategy: "round-robin",
});
```

---

#### getEnhancedToolDiscovery()

> **getEnhancedToolDiscovery**(): `Promise`\<`any`\>

Defined in: [neurolink.ts:15970](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L15970)

Get the enhanced tool discovery service
Provides advanced search, filtering, and compatibility checking for tools

##### Returns

`Promise`\<`any`\>

EnhancedToolDiscovery instance

##### Example

```typescript
const discovery = neurolink.getEnhancedToolDiscovery();

// Search for tools by criteria
const results = await discovery.searchTools({
  category: "data-processing",
  capabilities: ["streaming", "batch"],
  minReliability: 0.9,
});
```

---

#### getMCPRegistryClient()

> **getMCPRegistryClient**(): `Promise`\<`any`\>

Defined in: [neurolink.ts:15997](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L15997)

Get the MCP registry client for discovering servers from registries
Supports multiple registry sources (official, community, custom)

##### Returns

`Promise`\<`any`\>

The global MCPRegistryClient instance

##### Example

```typescript
const registryClient = neurolink.getMCPRegistryClient();

// Search for servers
const servers = await registryClient.searchServers({
  query: "database",
  categories: ["data", "storage"],
});

// Get a well-known server config
const githubServer = registryClient.getWellKnownServer("github");
```

---

#### exposeAgentAsTool()

> **exposeAgentAsTool**(`agent`, `options?`): `Promise`\<[`ExposureResult`](../type-aliases/ExposureResult.md)\>

Defined in: [neurolink.ts:16025](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L16025)

Expose a NeuroLink agent as an MCP tool
This allows agents to be called by other systems via MCP

##### Parameters

###### agent

The agent to expose (must include id, name, description, and execute)

###### id

`string`

###### name

`string`

###### description

`string`

###### execute

(`params`, `context?`) => `Promise`\<`unknown`\>

###### options?

Exposure configuration options (prefix, defaultAnnotations, etc.)

###### prefix?

`string`

###### includeMetadataInDescription?

`boolean`

###### wrapWithContext?

`boolean`

###### executionTimeout?

`number`

###### enableLogging?

`boolean`

##### Returns

`Promise`\<[`ExposureResult`](../type-aliases/ExposureResult.md)\>

The exposed tool definition

##### Example

```typescript
const agent = {
  id: 'my-agent',
  name: 'My Agent',
  description: 'An agent that processes data',
  execute: async (params) => { ... }
};
const tool = await neurolink.exposeAgentAsTool(agent, {
  prefix: 'agent_'
});
```

---

#### exposeWorkflowAsTool()

> **exposeWorkflowAsTool**(`workflow`, `options?`): `Promise`\<[`ExposureResult`](../type-aliases/ExposureResult.md)\>

Defined in: [neurolink.ts:16066](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L16066)

Expose a workflow as an MCP tool
This allows workflows to be called by other systems via MCP

##### Parameters

###### workflow

The workflow to expose (must include id, name, description, and execute)

###### id

`string`

###### name

`string`

###### description

`string`

###### execute

(`params`, `context?`) => `Promise`\<`unknown`\>

###### steps?

`object`[]

###### options?

Exposure configuration options (prefix, defaultAnnotations, etc.)

###### prefix?

`string`

###### includeMetadataInDescription?

`boolean`

###### wrapWithContext?

`boolean`

###### executionTimeout?

`number`

###### enableLogging?

`boolean`

##### Returns

`Promise`\<[`ExposureResult`](../type-aliases/ExposureResult.md)\>

The exposed tool definition

##### Example

```typescript
const workflow = {
  id: 'data-pipeline',
  name: 'Data Pipeline',
  description: 'Runs the data processing pipeline',
  execute: async (params) => { ... }
};
const tool = await neurolink.exposeWorkflowAsTool(workflow, {
  prefix: 'workflow_'
});
```

---

#### getToolIntegrationManager()

> **getToolIntegrationManager**(): `Promise`\<`any`\>

Defined in: [neurolink.ts:16105](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L16105)

Get the tool integration manager for middleware and elicitation
Provides advanced tool wrapping with confirmation, timeout, retry, etc.

##### Returns

`Promise`\<`any`\>

The global ToolIntegrationManager instance

##### Example

```typescript
const integration = neurolink.getToolIntegrationManager();

// Register a tool with middleware
integration.registerTool(myTool, {
  timeout: 30000,
  retries: 3,
  requireConfirmation: true,
});
```

---

#### convertToolsToMCPFormat()

> **convertToolsToMCPFormat**(`tools`, `options?`): `Promise`\<`any`\>

Defined in: [neurolink.ts:16127](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L16127)

Convert NeuroLink tools to MCP format
Useful for exposing local tools to external MCP clients

##### Parameters

###### tools

`object`[]

Array of NeuroLink tool definitions

###### options?

Conversion options

###### namespacePrefix?

`string`

##### Returns

`Promise`\<`any`\>

Array of MCP-formatted tools

##### Example

```typescript
const mcpTools = neurolink.convertToolsToMCPFormat([
  { name: "myTool", description: "Does something", execute: async () => {} },
]);
```

---

#### convertToolsFromMCPFormat()

> **convertToolsFromMCPFormat**(`tools`, `options?`): `Promise`\<`any`\>

Defined in: [neurolink.ts:16166](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L16166)

Convert MCP tools to NeuroLink format
Useful for importing tools from external MCP servers

##### Parameters

###### tools

`object`[]

Array of MCP tool definitions

###### options?

Conversion options

###### removeNamespacePrefix?

`string`

##### Returns

`Promise`\<`any`\>

Array of NeuroLink-formatted tools

##### Example

```typescript
const neurolinkTools = neurolink.convertToolsFromMCPFormat(externalTools, {
  removeNamespacePrefix: "external_",
});
```

---

#### getToolAnnotations()

> **getToolAnnotations**(`toolName`): `Promise`\<\{ `annotations`: [`MCPToolAnnotations`](../type-aliases/MCPToolAnnotations.md); `summary`: `string`; \} \| `null`\>

Defined in: [neurolink.ts:16189](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L16189)

Get tool annotations and safety information
Provides insights about tool behavior, safety levels, and retry-ability

##### Parameters

###### toolName

`string`

Name of the tool to analyze

##### Returns

`Promise`\<\{ `annotations`: [`MCPToolAnnotations`](../type-aliases/MCPToolAnnotations.md); `summary`: `string`; \} \| `null`\>

Tool annotation summary

##### Example

```typescript
const annotations = await neurolink.getToolAnnotations("deleteFile");
// Returns: { destructive: true, requiresConfirmation: true, safeToRetry: false }
```

---

#### createEvaluationPipeline()

> **createEvaluationPipeline**(`configOrPreset`): `Promise`\<[`EvaluationPipeline`](EvaluationPipeline.md)\>

Defined in: [neurolink.ts:16428](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L16428)

Create an evaluation pipeline with the specified configuration or preset.
Pipelines orchestrate multiple scorers to evaluate AI responses comprehensively.

##### Parameters

###### configOrPreset

`"minimal"` \| [`PipelineConfig`](../type-aliases/PipelineConfig.md) \| `"quality"` \| `"codeGeneration"` \| `"summarization"` \| `"safety"` \| `"rag"` \| `"comprehensive"` \| `"customerSupport"`

Pipeline configuration object or preset name

##### Returns

`Promise`\<[`EvaluationPipeline`](EvaluationPipeline.md)\>

Initialized evaluation pipeline

##### Examples

```typescript
const neurolink = new NeuroLink();
const pipeline = await neurolink.createEvaluationPipeline("rag");
const result = await pipeline.execute({
  query: "What is the capital of France?",
  response: "Paris is the capital of France.",
  context: ["France is a country in Europe. Paris is its capital."],
});
console.log(result.overallScore, result.passed);
```

```typescript
const pipeline = await neurolink.createEvaluationPipeline({
  name: "custom-quality",
  scorers: [
    { id: "toxicity", config: { threshold: 0.9 } },
    { id: "hallucination", config: { weight: 1.5 } },
    { id: "answer-relevancy" },
  ],
  aggregation: { method: "weighted" },
  passThreshold: 0.8,
});
```

---

#### evaluate()

> **evaluate**(`input`, `options?`): `Promise`\<[`PipelineResult`](../type-aliases/PipelineResult.md)\>

Defined in: [neurolink.ts:16520](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L16520)

Evaluate an AI response using the specified pipeline or scorers.
This is a convenience method that creates a pipeline and executes it in one call.

##### Parameters

###### input

[`ScorerInput`](../type-aliases/ScorerInput.md)

Scorer input containing query, response, and optional context

###### options?

Evaluation options including pipeline preset or custom scorers

###### pipeline?

`"minimal"` \| `"quality"` \| `"codeGeneration"` \| `"summarization"` \| `"safety"` \| `"rag"` \| `"comprehensive"` \| `"customerSupport"`

Pipeline preset to use

###### scorers?

`string`[]

Specific scorers to use (alternative to pipeline)

###### passThreshold?

`number`

Pass threshold override (0-1)

###### executionMode?

`"parallel"` \| `"sequential"`

Execution mode

###### correlationId?

`string`

Correlation ID for tracing

###### timeoutMs?

`number`

Overall evaluation timeout in milliseconds

##### Returns

`Promise`\<[`PipelineResult`](../type-aliases/PipelineResult.md)\>

Evaluation pipeline result with scores and pass/fail status

##### Examples

```typescript
const neurolink = new NeuroLink();
const result = await neurolink.evaluate(
  {
    query: "Explain quantum computing",
    response: "Quantum computing uses qubits...",
  },
  { pipeline: "quality" },
);
console.log(`Score: ${result.overallScore}, Passed: ${result.passed}`);
```

```typescript
const result = await neurolink.evaluate(
  {
    query: "What causes rain?",
    response: "Rain is caused by water vapor...",
    context: ["The water cycle involves evaporation..."],
  },
  { scorers: ["hallucination", "faithfulness", "answer-relevancy"] },
);
```

```typescript
const result = await neurolink.evaluate(
  {
    query: "Who wrote Hamlet?",
    response: "Shakespeare wrote Hamlet in 1600.",
    context: ["William Shakespeare wrote Hamlet around 1600-1601."],
    groundTruth: "William Shakespeare",
  },
  { pipeline: "rag" },
);
```

---

#### score()

> **score**(`scorerId`, `input`, `config?`): `Promise`\<[`ScoreResult`](../type-aliases/ScoreResult.md)\>

Defined in: [neurolink.ts:16658](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L16658)

Score a response using a single scorer.
Useful for quick, targeted evaluations without the overhead of a full pipeline.

##### Parameters

###### scorerId

`string`

The ID of the scorer to use (e.g., 'toxicity', 'hallucination')

###### input

[`ScorerInput`](../type-aliases/ScorerInput.md)

Scorer input containing query, response, and optional context

###### config?

[`ScorerConfig`](../type-aliases/ScorerConfig.md)

Optional scorer configuration overrides

##### Returns

`Promise`\<[`ScoreResult`](../type-aliases/ScoreResult.md)\>

Score result with value, reasoning, and pass/fail status

##### Examples

```typescript
const neurolink = new NeuroLink();
const result = await neurolink.score("toxicity", {
  query: "",
  response: "This is a helpful response about cooking recipes.",
});
console.log(`Toxicity Score: ${result.score}/10, Passed: ${result.passed}`);
```

```typescript
const result = await neurolink.score("hallucination", {
  query: "What year was the Eiffel Tower built?",
  response: "The Eiffel Tower was built in 1889.",
  context: ["The Eiffel Tower was constructed from 1887-1889."],
});
console.log(`Score: ${result.score}, Reasoning: ${result.reasoning}`);
```

```typescript
const result = await neurolink.score(
  "faithfulness",
  {
    query: "Summarize the article",
    response: "The article discusses...",
    context: ["Article content here..."],
  },
  { threshold: 0.85, weight: 1.5 },
);
```

---

#### getAvailableScorers()

> **getAvailableScorers**(`options?`): `Promise`\<[`ScorerMetadata`](../type-aliases/ScorerMetadata.md)[]\>

Defined in: [neurolink.ts:16744](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L16744)

Get a list of all available scorers and their metadata.
Useful for discovering what evaluation capabilities are available.

##### Parameters

###### options?

Filter options

###### category?

[`ScorerCategory`](../type-aliases/ScorerCategory.md)

Filter by category

###### type?

[`ScorerType`](../type-aliases/ScorerType.md)

Filter by type

##### Returns

`Promise`\<[`ScorerMetadata`](../type-aliases/ScorerMetadata.md)[]\>

Array of scorer metadata

##### Examples

```typescript
const neurolink = new NeuroLink();
const scorers = await neurolink.getAvailableScorers();
for (const scorer of scorers) {
  console.log(`${scorer.id}: ${scorer.description} (${scorer.type})`);
}
```

```typescript
const safetyScorers = await neurolink.getAvailableScorers({
  category: "safety",
});
console.log(
  "Safety scorers:",
  safetyScorers.map((s) => s.id),
);
```

```typescript
const ruleBasedScorers = await neurolink.getAvailableScorers({
  type: "rule",
});
```

---

#### getEvaluationPresets()

> **getEvaluationPresets**(): `Promise`\<`string`[]\>

Defined in: [neurolink.ts:16790](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L16790)

Get a list of available evaluation pipeline presets.
Presets are pre-configured pipelines for common evaluation scenarios.

##### Returns

`Promise`\<`string`[]\>

Array of preset names

##### Example

```typescript
const neurolink = new NeuroLink();
const presets = await neurolink.getEvaluationPresets();
console.log("Available presets:", presets);
// Output: ['safety', 'rag', 'quality', 'comprehensive', 'minimal', ...]
```

---

#### getEvaluationPreset()

> **getEvaluationPreset**(`presetName`): `Promise`\<[`PipelineConfig`](../type-aliases/PipelineConfig.md)\>

Defined in: [neurolink.ts:16813](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L16813)

Get details of a specific evaluation preset.

##### Parameters

###### presetName

`"minimal"` \| `"quality"` \| `"codeGeneration"` \| `"summarization"` \| `"safety"` \| `"rag"` \| `"comprehensive"` \| `"customerSupport"`

Name of the preset

##### Returns

`Promise`\<[`PipelineConfig`](../type-aliases/PipelineConfig.md)\>

Pipeline configuration for the preset

##### Example

```typescript
const neurolink = new NeuroLink();
const ragPreset = await neurolink.getEvaluationPreset("rag");
console.log(
  "RAG preset scorers:",
  ragPreset.scorers.map((s) => s.id),
);
console.log("Pass threshold:", ragPreset.passThreshold);
```

---

#### createAgent()

> **createAgent**(`definition`): `Promise`\<[`Agent`](Agent.md)\>

Defined in: [neurolink.ts:16863](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L16863)

Create an Agent instance for multi-agent orchestration.

Agents are specialized AI entities with defined instructions, tools, and behavior.
They can be composed into networks for complex task orchestration.

##### Parameters

###### definition

[`AgentDefinition`](../type-aliases/AgentDefinition.md)

Agent definition specifying behavior and capabilities

##### Returns

`Promise`\<[`Agent`](Agent.md)\>

A new Agent instance

##### Example

```typescript
const researcher = neurolink.createAgent({
  id: "researcher",
  name: "Research Agent",
  description: "Searches and analyzes information from various sources",
  instructions:
    "You are a research assistant. Search thoroughly and cite sources.",
  tools: ["websearchGrounding", "readFile"],
  model: "gpt-4o",
});

const result = await researcher.execute("Find recent AI breakthroughs");
```

##### See

- [AgentDefinition](../type-aliases/AgentDefinition.md) for definition options
- [Agent](Agent.md) for agent methods

##### Since

8.38.0

---

#### createNetwork()

> **createNetwork**(`config`): `Promise`\<[`AgentNetwork`](AgentNetwork.md)\>

Defined in: [neurolink.ts:16925](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L16925)

Create an AgentNetwork for multi-agent orchestration.

Networks coordinate multiple agents, workflows, and tools with intelligent
LLM-powered routing. The router agent analyzes tasks and delegates to
the most appropriate primitive.

##### Parameters

###### config

[`AgentNetworkConfig`](../type-aliases/AgentNetworkConfig.md)

Network configuration with agents, workflows, and routing settings

##### Returns

`Promise`\<[`AgentNetwork`](AgentNetwork.md)\>

A new AgentNetwork instance

##### Example

```typescript
const network = neurolink.createNetwork({
  name: "Content Team",
  description: "Collaborative content creation pipeline",
  agents: [
    {
      id: "researcher",
      name: "Researcher",
      description: "Finds and verifies information",
      instructions: "Research topics thoroughly...",
    },
    {
      id: "writer",
      name: "Writer",
      description: "Creates engaging content",
      instructions: "Write clear, engaging content...",
    },
    {
      id: "editor",
      name: "Editor",
      description: "Reviews and improves content",
      instructions: "Review for clarity and accuracy...",
    },
  ],
  router: {
    model: "gpt-4o",
    confidenceThreshold: 0.7,
  },
});

const result = await network.execute({
  message: "Write an article about quantum computing",
});
```

##### See

- [AgentNetworkConfig](../type-aliases/AgentNetworkConfig.md) for configuration options
- [AgentNetwork](AgentNetwork.md) for network methods

##### Since

8.38.0

---

#### createWorkerInstance()

> **createWorkerInstance**(`options?`): `NeuroLink`

Defined in: [neurolink.ts:16957](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L16957)

Create a worker-mode NeuroLink instance for sub-agent execution.

Worker mode is the framework-provided version of the config block every
consumer used to copy by hand: conversation memory OFF, orchestration
OFF, observability inherited from this instance with
`autoDetectExternalProvider: true` + `skipLangfuseSpanProcessor: true`
(worker spans join the host's tracer without duplicate Langfuse
exports), credentials inherited, the host's tool registry shared (so
worker tool calls reuse the host's connections), and an internal log
bridge attached with a caller-supplied tag.

Dispose the worker (`worker.dispose()`) when done — `runIsolatedAgent`
does this automatically in a `finally`.

##### Parameters

###### options?

[`WorkerInstanceOptions`](../type-aliases/WorkerInstanceOptions.md)

Worker options (log tag/sink, registry sharing, config)

##### Returns

`NeuroLink`

A new worker-mode NeuroLink instance

##### See

[WorkerInstanceOptions](../type-aliases/WorkerInstanceOptions.md)

---

#### runIsolatedAgent()

> **runIsolatedAgent**(`definition`, `input`, `options?`): `Promise`\<[`AgentRunOutcome`](../type-aliases/AgentRunOutcome.md)\>

Defined in: [neurolink.ts:17046](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L17046)

Run an isolated sub-agent: a worker instance (see
[createWorkerInstance](#createworkerinstance)) executes a tool-using research pass under
the turn budget (wrap-up nudge, stall watchdog, honest `stopReason`),
then an extraction pass ALWAYS runs tools-off on its own timeout with a
structured-recovery ladder and corrective re-asks. A non-empty execution
record never produces an empty result (mechanical digest fallback), a
parent `abortSignal` stops everything cleanly, and `options.leg` enables
leashed mode with TTL'd resume handles ([continueAgent](#continueagent) /
[stopAgent](#stopagent)).

##### Parameters

###### definition

[`IsolatedAgentDefinition`](../type-aliases/IsolatedAgentDefinition.md)

Agent definition (+ optional structured extraction)

###### input

`string` \| `Record`\<`string`, `unknown`\>

Task input: string or structured object

###### options?

[`AgentRunOptions`](../type-aliases/AgentRunOptions.md)

Run options (abort, overrides, tool context, events, leg)

##### Returns

`Promise`\<[`AgentRunOutcome`](../type-aliases/AgentRunOutcome.md)\>

The run outcome

##### See

- [IsolatedAgentDefinition](../type-aliases/IsolatedAgentDefinition.md)
- [AgentRunOptions](../type-aliases/AgentRunOptions.md)
- [AgentRunOutcome](../type-aliases/AgentRunOutcome.md)

---

#### continueAgent()

> **continueAgent**(`handle`, `guidance?`): `Promise`\<[`AgentRunOutcome`](../type-aliases/AgentRunOutcome.md)\>

Defined in: [neurolink.ts:17065](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L17065)

Resume a leashed isolated-agent run by handle. `guidance`, when given,
is appended as a user turn before the next leg — the supervisor's
re-steering channel. An expired handle returns its tombstoned final
outcome exactly once.

##### Parameters

###### handle

`string`

Handle from an `in_progress` [AgentRunOutcome](../type-aliases/AgentRunOutcome.md)

###### guidance?

`string`

Optional supervisor guidance for the next leg

##### Returns

`Promise`\<[`AgentRunOutcome`](../type-aliases/AgentRunOutcome.md)\>

The next leg's outcome (or the final outcome)

---

#### stopAgent()

> **stopAgent**(`handle`): `Promise`\<[`AgentRunOutcome`](../type-aliases/AgentRunOutcome.md)\>

Defined in: [neurolink.ts:17081](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L17081)

Stop a leashed isolated-agent run: dispose its worker and return the
final outcome (mechanical digest over everything gathered so far).

##### Parameters

###### handle

`string`

Handle from an `in_progress` [AgentRunOutcome](../type-aliases/AgentRunOutcome.md)

##### Returns

`Promise`\<[`AgentRunOutcome`](../type-aliases/AgentRunOutcome.md)\>

The final outcome

---

#### registerAgentTool()

> **registerAgentTool**(`definition`, `options?`): `Promise`\<\{ `name`: `string`; \}\>

Defined in: [neurolink.ts:17099](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L17099)

Register an isolated agent as a delegation tool on THIS instance, so
its existing generate() loop can delegate — no second router generate.
Framework policy (per-turn caps, depth withholding, a process-wide
concurrency pool with queue timeout) is enforced in the loop itself,
and every refusal carries its recovery instruction in the error text.

##### Parameters

###### definition

[`IsolatedAgentDefinition`](../type-aliases/IsolatedAgentDefinition.md)

Agent definition (+ optional structured extraction)

###### options?

[`AgentToolRegistrationOptions`](../type-aliases/AgentToolRegistrationOptions.md)

Registration options (name, caps, depth, pool, leg)

##### Returns

`Promise`\<\{ `name`: `string`; \}\>

The registered tool name

##### See

[AgentToolRegistrationOptions](../type-aliases/AgentToolRegistrationOptions.md)

---

#### executeNetwork()

> **executeNetwork**(`network`, `input`, `options?`): `Promise`\<[`NetworkExecutionResult`](../type-aliases/NetworkExecutionResult.md)\>

Defined in: [neurolink.ts:17121](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L17121)

Execute an agent network with the given input.

##### Parameters

###### network

[`AgentNetwork`](AgentNetwork.md)

The agent network to execute

###### input

[`NetworkExecutionInput`](../type-aliases/NetworkExecutionInput.md)

Execution input (message and context)

###### options?

[`NetworkExecutionOptions`](../type-aliases/NetworkExecutionOptions.md)

Optional execution options

##### Returns

`Promise`\<[`NetworkExecutionResult`](../type-aliases/NetworkExecutionResult.md)\>

Network execution result with content, trace, and usage

##### See

- [NetworkExecutionInput](../type-aliases/NetworkExecutionInput.md) for input options
- [NetworkExecutionResult](../type-aliases/NetworkExecutionResult.md) for result structure

##### Since

8.38.0

---

#### streamNetwork()

> **streamNetwork**(`network`, `input`, `options?`): `AsyncIterable`\<[`NetworkStreamChunk`](../type-aliases/NetworkStreamChunk.md)\>

Defined in: [neurolink.ts:17145](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L17145)

Stream agent network execution with real-time events.

##### Parameters

###### network

[`AgentNetwork`](AgentNetwork.md)

The agent network to stream

###### input

[`NetworkExecutionInput`](../type-aliases/NetworkExecutionInput.md)

Execution input (message and context)

###### options?

[`NetworkExecutionOptions`](../type-aliases/NetworkExecutionOptions.md)

Optional execution options

##### Returns

`AsyncIterable`\<[`NetworkStreamChunk`](../type-aliases/NetworkStreamChunk.md)\>

Async iterable of network stream chunks

##### See

[NetworkStreamChunk](../type-aliases/NetworkStreamChunk.md) for chunk types

##### Since

8.38.0

---

#### createOrchestrator()

> **createOrchestrator**(`config?`): `Promise`\<[`NetworkOrchestrator`](NetworkOrchestrator.md)\>

Defined in: [neurolink.ts:17169](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L17169)

Create a NetworkOrchestrator for managing multiple agent networks.

##### Parameters

###### config?

[`OrchestratorConfig`](../type-aliases/OrchestratorConfig.md)

Orchestrator configuration options

##### Returns

`Promise`\<[`NetworkOrchestrator`](NetworkOrchestrator.md)\>

A new NetworkOrchestrator instance

##### Since

8.38.0

---

#### createCoordinator()

> **createCoordinator**(`config?`): `Promise`\<[`AgentCoordinator`](AgentCoordinator.md)\>

Defined in: [neurolink.ts:17188](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L17188)

Create an AgentCoordinator for managing agent coordination strategies.

##### Parameters

###### config?

[`CoordinatorConfig`](../type-aliases/CoordinatorConfig.md)

Coordinator configuration options

##### Returns

`Promise`\<[`AgentCoordinator`](AgentCoordinator.md)\>

A new AgentCoordinator instance

##### Since

8.38.0

---

#### createMessageBus()

> **createMessageBus**(`config?`): `Promise`\<[`MessageBus`](MessageBus.md)\>

Defined in: [neurolink.ts:17206](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L17206)

Create a MessageBus for inter-agent communication.

##### Parameters

###### config?

[`MessageBusConfig`](../type-aliases/MessageBusConfig.md)

Message bus configuration options

##### Returns

`Promise`\<[`MessageBus`](MessageBus.md)\>

A new MessageBus instance

##### Since

8.38.0

---

#### dispose()

> **dispose**(): `Promise`\<`void`\>

Defined in: [neurolink.ts:17221](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L17221)

Dispose of all resources and cleanup connections
Call this method when done using the NeuroLink instance to prevent resource leaks
Especially important in test environments where multiple instances are created

##### Returns

`Promise`\<`void`\>

---

#### getToolRegistry()

> **getToolRegistry**(): [`MCPToolRegistry`](MCPToolRegistry.md)

Defined in: [neurolink.ts:17408](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L17408)

Get the tool registry instance
Used internally by server adapters for tool management

##### Returns

[`MCPToolRegistry`](MCPToolRegistry.md)

The MCPToolRegistry instance

---

#### compactSession()

> **compactSession**(`sessionId`, `config?`): `Promise`\<[`CompactionResult`](../type-aliases/CompactionResult.md) \| `null`\>

Defined in: [neurolink.ts:17416](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L17416)

Manually trigger context compaction for a session.
Runs the full 4-stage compaction pipeline.

##### Parameters

###### sessionId

`string`

###### config?

[`CompactionConfig`](../type-aliases/CompactionConfig.md)

##### Returns

`Promise`\<[`CompactionResult`](../type-aliases/CompactionResult.md) \| `null`\>

---

#### getContextStats()

> **getContextStats**(`sessionId`, `provider?`, `model?`): `Promise`\<\{ `estimatedInputTokens`: `number`; `availableInputTokens`: `number`; `usageRatio`: `number`; `shouldCompact`: `boolean`; `messageCount`: `number`; \} \| `null`\>

Defined in: [neurolink.ts:17467](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L17467)

Get context usage statistics for a session.
Returns token counts, usage ratio, and breakdown by category.

##### Parameters

###### sessionId

`string`

###### provider?

`string`

###### model?

`string`

##### Returns

`Promise`\<\{ `estimatedInputTokens`: `number`; `availableInputTokens`: `number`; `usageRatio`: `number`; `shouldCompact`: `boolean`; `messageCount`: `number`; \} \| `null`\>

---

#### needsCompaction()

> **needsCompaction**(`sessionId`, `provider?`, `model?`): `boolean`

Defined in: [neurolink.ts:17509](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L17509)

Check if a session needs compaction.

##### Parameters

###### sessionId

`string`

###### provider?

`string`

###### model?

`string`

##### Returns

`boolean`

---

#### setAuthProvider()

> **setAuthProvider**(`config`): `Promise`\<`void`\>

Defined in: [neurolink.ts:17546](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L17546)

Set the authentication provider for the NeuroLink instance

##### Parameters

###### config

[`NeuroLinkAuthConfig`](../type-aliases/NeuroLinkAuthConfig.md)

Auth provider or configuration to create one

##### Returns

`Promise`\<`void`\>

---

#### getAuthProvider()

> **getAuthProvider**(): [`AuthProvider`](../type-aliases/AuthProvider.md) \| `undefined`

Defined in: [neurolink.ts:17594](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L17594)

Get the currently configured authentication provider

##### Returns

[`AuthProvider`](../type-aliases/AuthProvider.md) \| `undefined`

---

#### setAuthContext()

> **setAuthContext**(`context`): `Promise`\<`void`\>

Defined in: [neurolink.ts:17635](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L17635)

Set the current authentication context for request handling.

Delegates to the global AuthContextHolder so that auth state is NOT
stored as an instance field (which would leak between concurrent requests
sharing the same NeuroLink singleton). Prefer `runWithAuthContext()` from
`authContext.ts` for proper request-scoped context via AsyncLocalStorage.

##### Parameters

###### context

[`AuthenticatedContext`](../type-aliases/AuthenticatedContext.md)

The authenticated user context

##### Returns

`Promise`\<`void`\>

---

#### getAuthContext()

> **getAuthContext**(): `Promise`\<[`AuthenticatedContext`](../type-aliases/AuthenticatedContext.md) \| `undefined`\>

Defined in: [neurolink.ts:17650](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L17650)

Get the current authentication context.

Checks AsyncLocalStorage first, then falls back to the global holder.

##### Returns

`Promise`\<[`AuthenticatedContext`](../type-aliases/AuthenticatedContext.md) \| `undefined`\>

---

#### clearAuthContext()

> **clearAuthContext**(): `Promise`\<`void`\>

Defined in: [neurolink.ts:17658](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L17658)

Clear the current authentication context

##### Returns

`Promise`\<`void`\>

---

#### getExternalServerManager()

> **getExternalServerManager**(): [`ExternalServerManager`](ExternalServerManager.md)

Defined in: [neurolink.ts:17672](https://github.com/juspay/neurolink/blob/release/src/lib/neurolink.ts#L17672)

Get the external server manager instance
Used internally by server adapters for external MCP server management

##### Returns

[`ExternalServerManager`](ExternalServerManager.md)

The ExternalServerManager instance
