[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / NeuroLink

# Class: NeuroLink

Defined in: [neurolink.ts:528](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L528)

## Constructors

### Constructor

> **new NeuroLink**(`config?`): `NeuroLink`

Defined in: [neurolink.ts:1122](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L1122)

#### Parameters

##### config?

[`NeurolinkConstructorConfig`](../type-aliases/NeurolinkConstructorConfig.md)

#### Returns

`NeuroLink`

## Properties

### conversationMemory?

> `optional` **conversationMemory?**: `ConversationMemoryManager` \| `RedisConversationMemoryManager` \| `null`

Defined in: [neurolink.ts:627](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L627)

## Accessors

### tasks

#### Get Signature

> **get** **tasks**(): `TaskManager`

Defined in: [neurolink.ts:1224](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L1224)

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

Defined in: [neurolink.ts:3624](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L3624)

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

#### getObservabilityConfig()

> **getObservabilityConfig**(): [`ObservabilityConfig`](../type-aliases/ObservabilityConfig.md) \| `undefined`

Defined in: [neurolink.ts:2955](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L2955)

Get observability configuration

##### Returns

[`ObservabilityConfig`](../type-aliases/ObservabilityConfig.md) \| `undefined`

---

#### isTelemetryEnabled()

> **isTelemetryEnabled**(): `boolean`

Defined in: [neurolink.ts:2963](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L2963)

Check if Langfuse telemetry is enabled
Centralized utility to avoid duplication across providers

##### Returns

`boolean`

---

#### getTelemetryStatus()

> **getTelemetryStatus**(): `object`

Defined in: [neurolink.ts:2975](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L2975)

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

Defined in: [neurolink.ts:3030](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L3030)

Get aggregated observability metrics (latency, tokens, cost, success rate)

##### Returns

[`MetricsSummary`](../type-aliases/MetricsSummary.md)

---

#### getSpans()

> **getSpans**(): [`SpanData`](../type-aliases/SpanData.md)[]

Defined in: [neurolink.ts:3037](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L3037)

Get all recorded spans

##### Returns

[`SpanData`](../type-aliases/SpanData.md)[]

---

#### getTraces()

> **getTraces**(): [`TraceView`](../type-aliases/TraceView.md)[]

Defined in: [neurolink.ts:3044](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L3044)

Get traces (spans grouped by traceId with parent-child hierarchy)

##### Returns

[`TraceView`](../type-aliases/TraceView.md)[]

---

#### resetMetrics()

> **resetMetrics**(): `void`

Defined in: [neurolink.ts:3051](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L3051)

Reset all collected metrics and spans

##### Returns

`void`

---

#### recordMetricsSpan()

> **recordMetricsSpan**(`span`): `void`

Defined in: [neurolink.ts:3058](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L3058)

Record a span for metrics tracking

##### Parameters

###### span

[`SpanData`](../type-aliases/SpanData.md)

##### Returns

`void`

---

#### initializeLangfuseObservability()

> **initializeLangfuseObservability**(): `Promise`\<`void`\>

Defined in: [neurolink.ts:3098](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L3098)

Public method to initialize Langfuse observability
This method can be called externally to ensure Langfuse is properly initialized

##### Returns

`Promise`\<`void`\>

---

#### shutdown()

> **shutdown**(): `Promise`\<`void`\>

Defined in: [neurolink.ts:3128](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L3128)

Gracefully shutdown NeuroLink and all MCP connections

##### Returns

`Promise`\<`void`\>

---

#### generateText()

> **generateText**(`options`): `Promise`\<[`TextGenerationResult`](../type-aliases/TextGenerationResult.md)\>

Defined in: [neurolink.ts:4820](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L4820)

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

Defined in: [neurolink.ts:6800](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L6800)

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

Defined in: [neurolink.ts:6880](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L6880)

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
  process.stdout.write(chunk.content);
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

#### getEventEmitter()

> **getEventEmitter**(): `TypedEventEmitter`\<[`NeuroLinkEvents`](../type-aliases/NeuroLinkEvents.md)\>

Defined in: [neurolink.ts:9228](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L9228)

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

#### checkCredentials()

> **checkCredentials**(`input`): `Promise`\<\{ `provider`: `string`; `status`: `"expired"` \| `"unknown"` \| `"ok"` \| `"missing"` \| `"denied"` \| `"network"`; `detail`: `string`; \}\>

Defined in: [neurolink.ts:9258](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L9258)

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

`Promise`\<\{ `provider`: `string`; `status`: `"expired"` \| `"unknown"` \| `"ok"` \| `"missing"` \| `"denied"` \| `"network"`; `detail`: `string`; \}\>

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

Defined in: [neurolink.ts:9337](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L9337)

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

Defined in: [neurolink.ts:9388](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L9388)

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

Defined in: [neurolink.ts:9469](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L9469)

Get current tool execution contexts for stream metadata

##### Returns

[`ToolExecutionContext`](../type-aliases/ToolExecutionContext.md)[]

---

#### getToolExecutionHistory()

> **getToolExecutionHistory**(): [`ToolExecutionSummary`](../type-aliases/ToolExecutionSummary.md)[]

Defined in: [neurolink.ts:9476](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L9476)

Get tool execution history

##### Returns

[`ToolExecutionSummary`](../type-aliases/ToolExecutionSummary.md)[]

---

#### clearCurrentStreamExecutions()

> **clearCurrentStreamExecutions**(): `void`

Defined in: [neurolink.ts:9483](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L9483)

Clear current stream tool executions (called at stream start)

##### Returns

`void`

---

#### registerTool()

> **registerTool**(`name`, `tool`, `options?`): `void`

Defined in: [neurolink.ts:9499](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L9499)

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

Defined in: [neurolink.ts:9640](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L9640)

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

Defined in: [neurolink.ts:9655](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L9655)

Get the current tool execution context

##### Returns

`Record`\<`string`, `unknown`\> \| `undefined`

Current context or undefined if not set

---

#### clearToolContext()

> **clearToolContext**(): `void`

Defined in: [neurolink.ts:9664](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L9664)

Clear the tool execution context

##### Returns

`void`

---

#### registerTools()

> **registerTools**(`tools`): `void`

Defined in: [neurolink.ts:9676](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L9676)

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

Defined in: [neurolink.ts:9699](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L9699)

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

Defined in: [neurolink.ts:9717](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L9717)

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

Defined in: [neurolink.ts:9730](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L9730)

Get all registered tool middlewares

##### Returns

[`ToolMiddleware`](../type-aliases/ToolMiddleware.md)[]

---

#### flushToolBatch()

> **flushToolBatch**(): `Promise`\<`void`\>

Defined in: [neurolink.ts:9737](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L9737)

Flush any pending batched tool calls immediately

##### Returns

`Promise`\<`void`\>

---

#### getMCPEnhancementsConfig()

> **getMCPEnhancementsConfig**(): [`MCPEnhancementsConfig`](../type-aliases/MCPEnhancementsConfig.md) \| `undefined`

Defined in: [neurolink.ts:9746](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L9746)

Get the current MCP enhancements configuration

##### Returns

[`MCPEnhancementsConfig`](../type-aliases/MCPEnhancementsConfig.md) \| `undefined`

---

#### updateAgenticLoopReport()

> **updateAgenticLoopReport**(`sessionId`, `report`, `userId?`): `Promise`\<`void`\>

Defined in: [neurolink.ts:9769](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L9769)

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

Defined in: [neurolink.ts:9805](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L9805)

Get all registered custom tools

##### Returns

`Map`\<`string`, \{ `name`: `string`; `description`: `string`; `inputSchema?`: `object`; `execute?`: (`params`, `context?`) => `unknown`; \}\>

Map of tool names to MCPExecutableTool format

---

#### addInMemoryMCPServer()

> **addInMemoryMCPServer**(`serverId`, `serverInfo`): `Promise`\<`void`\>

Defined in: [neurolink.ts:9943](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L9943)

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

Defined in: [neurolink.ts:9987](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L9987)

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

Defined in: [neurolink.ts:10014](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L10014)

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

Defined in: [neurolink.ts:10030](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L10030)

Get auto-discovered servers as MCPServerInfo - ZERO conversion needed

##### Returns

[`MCPServerInfo`](../type-aliases/MCPServerInfo.md)[]

Array of MCPServerInfo

---

#### executeTool()

> **executeTool**\<`T`\>(`toolName`, `params?`, `options?`): `Promise`\<`T`\>

Defined in: [neurolink.ts:10042](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L10042)

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

Defined in: [neurolink.ts:11031](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L11031)

##### Returns

`Promise`\<[`ToolInfo`](../type-aliases/ToolInfo.md)[]\>

---

#### getProviderStatus()

> **getProviderStatus**(`options?`): `Promise`\<[`ProviderStatus`](../type-aliases/ProviderStatus.md)[]\>

Defined in: [neurolink.ts:11208](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L11208)

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

Defined in: [neurolink.ts:11394](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L11394)

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

Defined in: [neurolink.ts:11426](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L11426)

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

Defined in: [neurolink.ts:11435](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L11435)

Get list of all available AI provider names

##### Returns

`Promise`\<`string`[]\>

Array of supported provider names

---

#### isValidProvider()

> **isValidProvider**(`providerName`): `Promise`\<`boolean`\>

Defined in: [neurolink.ts:11445](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L11445)

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

Defined in: [neurolink.ts:11458](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L11458)

Get comprehensive MCP (Model Context Protocol) status information

##### Returns

`Promise`\<[`MCPStatus`](../type-aliases/MCPStatus.md)\>

Promise resolving to MCP status details

---

#### listMCPServers()

> **listMCPServers**(): `Promise`\<[`MCPServerInfo`](../type-aliases/MCPServerInfo.md)[]\>

Defined in: [neurolink.ts:11528](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L11528)

List all configured MCP servers with their status

##### Returns

`Promise`\<[`MCPServerInfo`](../type-aliases/MCPServerInfo.md)[]\>

Promise resolving to array of MCP server information

---

#### testMCPServer()

> **testMCPServer**(`serverId`): `Promise`\<`boolean`\>

Defined in: [neurolink.ts:11543](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L11543)

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

Defined in: [neurolink.ts:11584](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L11584)

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

Defined in: [neurolink.ts:11610](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L11610)

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

Defined in: [neurolink.ts:11656](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L11656)

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

Defined in: [neurolink.ts:11700](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L11700)

Get a summary of provider health across all supported providers

##### Returns

`Promise`\<\{ `total`: `number`; `healthy`: `number`; `configured`: `number`; `hasIssues`: `number`; `healthyProviders`: `string`[]; `unhealthyProviders`: `string`[]; `recommendations`: `string`[]; \}\>

Promise resolving to health summary statistics

---

#### clearProviderHealthCache()

> **clearProviderHealthCache**(`providerName?`): `Promise`\<`void`\>

Defined in: [neurolink.ts:11747](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L11747)

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

Defined in: [neurolink.ts:11758](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L11758)

Get execution metrics for all tools

##### Returns

`Record`\<`string`, \{ `totalExecutions`: `number`; `successfulExecutions`: `number`; `failedExecutions`: `number`; `successRate`: `number`; `averageExecutionTime`: `number`; `lastExecutionTime`: `number`; `errorCategories`: `Record`\<`string`, `number`\>; \}\>

Object with execution metrics for each tool

---

#### setModelAliasConfig()

> **setModelAliasConfig**(`config`): `void`

Defined in: [neurolink.ts:11802](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L11802)

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

Defined in: [neurolink.ts:11815](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L11815)

Get circuit breaker status for all tools

##### Returns

`Record`\<`string`, \{ `state`: `"closed"` \| `"open"` \| `"half-open"`; `failureCount`: `number`; `isHealthy`: `boolean`; \}\>

Object with circuit breaker status for each tool

---

#### resetToolCircuitBreaker()

> **resetToolCircuitBreaker**(`toolName`): `void`

Defined in: [neurolink.ts:11850](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L11850)

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

Defined in: [neurolink.ts:11867](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L11867)

Clear all tool execution metrics

##### Returns

`void`

---

#### getToolHealthReport()

> **getToolHealthReport**(): `Promise`\<\{ `totalTools`: `number`; `healthyTools`: `number`; `unhealthyTools`: `number`; `tools`: `Record`\<`string`, \{ `name`: `string`; `isHealthy`: `boolean`; `metrics`: \{ `totalExecutions`: `number`; `successRate`: `number`; `averageExecutionTime`: `number`; `lastExecutionTime`: `number`; `errorCategories`: `Record`\<`string`, `number`\>; \}; `circuitBreaker`: \{ `state`: `"closed"` \| `"open"` \| `"half-open"`; `failureCount`: `number`; \}; `issues`: `string`[]; `recommendations`: `string`[]; \}\>; \}\>

Defined in: [neurolink.ts:11876](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L11876)

Get comprehensive tool health report

##### Returns

`Promise`\<\{ `totalTools`: `number`; `healthyTools`: `number`; `unhealthyTools`: `number`; `tools`: `Record`\<`string`, \{ `name`: `string`; `isHealthy`: `boolean`; `metrics`: \{ `totalExecutions`: `number`; `successRate`: `number`; `averageExecutionTime`: `number`; `lastExecutionTime`: `number`; `errorCategories`: `Record`\<`string`, `number`\>; \}; `circuitBreaker`: \{ `state`: `"closed"` \| `"open"` \| `"half-open"`; `failureCount`: `number`; \}; `issues`: `string`[]; `recommendations`: `string`[]; \}\>; \}\>

Detailed health report for all tools

---

#### ensureConversationMemoryInitialized()

> **ensureConversationMemoryInitialized**(): `Promise`\<`boolean`\>

Defined in: [neurolink.ts:12031](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L12031)

Initialize conversation memory if enabled (public method for explicit initialization)
This is useful for testing or when you want to ensure conversation memory is ready

##### Returns

`Promise`\<`boolean`\>

Promise resolving to true if initialization was successful, false otherwise

---

#### getConversationStats()

> **getConversationStats**(): `Promise`\<[`ConversationMemoryStats`](../type-aliases/ConversationMemoryStats.md)\>

Defined in: [neurolink.ts:12051](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L12051)

Get conversation memory statistics (public API)

##### Returns

`Promise`\<[`ConversationMemoryStats`](../type-aliases/ConversationMemoryStats.md)\>

---

#### getConversationHistory()

> **getConversationHistory**(`sessionId`): `Promise`\<[`ChatMessage`](../type-aliases/ChatMessage.md)[]\>

Defined in: [neurolink.ts:12078](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L12078)

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

Defined in: [neurolink.ts:12134](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L12134)

Clear conversation history for a specific session (public API)

##### Parameters

###### sessionId

`string`

##### Returns

`Promise`\<`boolean`\>

---

#### clearAllConversations()

> **clearAllConversations**(): `Promise`\<`void`\>

Defined in: [neurolink.ts:12160](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L12160)

Clear all conversation history (public API)

##### Returns

`Promise`\<`void`\>

---

#### storeToolExecutions()

> **storeToolExecutions**(`sessionId`, `userId`, `toolCalls`, `toolResults`, `currentTime?`): `Promise`\<`void`\>

Defined in: [neurolink.ts:12191](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L12191)

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

Defined in: [neurolink.ts:12248](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L12248)

Check if tool execution storage is available

##### Returns

`boolean`

boolean indicating if Redis storage is configured and available

---

#### getSessionMessages()

> **getSessionMessages**(`sessionId`, `userId?`): `Promise`\<[`ChatMessage`](../type-aliases/ChatMessage.md)[]\>

Defined in: [neurolink.ts:12264](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L12264)

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

Defined in: [neurolink.ts:12305](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L12305)

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

Defined in: [neurolink.ts:12353](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L12353)

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

Defined in: [neurolink.ts:12384](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L12384)

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

Defined in: [neurolink.ts:12464](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L12464)

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

Defined in: [neurolink.ts:12510](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L12510)

List all external MCP servers

##### Returns

`object`[]

Array of server health information

---

#### getExternalMCPServer()

> **getExternalMCPServer**(`serverId`): [`ExternalMCPServerInstance`](../type-aliases/ExternalMCPServerInstance.md) \| `undefined`

Defined in: [neurolink.ts:12539](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L12539)

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

Defined in: [neurolink.ts:12553](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L12553)

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

Defined in: [neurolink.ts:12625](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L12625)

Get all tools from external MCP servers

##### Returns

[`ExternalMCPToolInfo`](../type-aliases/ExternalMCPToolInfo.md)[]

Array of external tool information

---

#### getExternalMCPServerTools()

> **getExternalMCPServerTools**(`serverId`): [`ExternalMCPToolInfo`](../type-aliases/ExternalMCPToolInfo.md)[]

Defined in: [neurolink.ts:12634](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L12634)

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

Defined in: [neurolink.ts:12643](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L12643)

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

Defined in: [neurolink.ts:12671](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L12671)

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

Defined in: [neurolink.ts:12686](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L12686)

Shutdown all external MCP servers
Called automatically on process exit

##### Returns

`Promise`\<`void`\>

---

#### getElicitationManager()

> **getElicitationManager**(): `Promise`\<`any`\>

Defined in: [neurolink.ts:12724](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L12724)

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

Defined in: [neurolink.ts:12752](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L12752)

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

Defined in: [neurolink.ts:12775](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L12775)

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

Defined in: [neurolink.ts:12800](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L12800)

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

Defined in: [neurolink.ts:12827](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L12827)

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

Defined in: [neurolink.ts:12855](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L12855)

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

Defined in: [neurolink.ts:12896](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L12896)

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

Defined in: [neurolink.ts:12935](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L12935)

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

Defined in: [neurolink.ts:12957](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L12957)

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

Defined in: [neurolink.ts:12996](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L12996)

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

Defined in: [neurolink.ts:13019](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L13019)

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

Defined in: [neurolink.ts:13258](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L13258)

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

Defined in: [neurolink.ts:13350](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L13350)

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

Defined in: [neurolink.ts:13488](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L13488)

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

Defined in: [neurolink.ts:13574](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L13574)

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

Defined in: [neurolink.ts:13620](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L13620)

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

Defined in: [neurolink.ts:13643](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L13643)

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

#### dispose()

> **dispose**(): `Promise`\<`void`\>

Defined in: [neurolink.ts:13667](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L13667)

Dispose of all resources and cleanup connections
Call this method when done using the NeuroLink instance to prevent resource leaks
Especially important in test environments where multiple instances are created

##### Returns

`Promise`\<`void`\>

---

#### getToolRegistry()

> **getToolRegistry**(): [`MCPToolRegistry`](MCPToolRegistry.md)

Defined in: [neurolink.ts:13852](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L13852)

Get the tool registry instance
Used internally by server adapters for tool management

##### Returns

[`MCPToolRegistry`](MCPToolRegistry.md)

The MCPToolRegistry instance

---

#### compactSession()

> **compactSession**(`sessionId`, `config?`): `Promise`\<[`CompactionResult`](../type-aliases/CompactionResult.md) \| `null`\>

Defined in: [neurolink.ts:13860](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L13860)

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

Defined in: [neurolink.ts:13911](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L13911)

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

Defined in: [neurolink.ts:13953](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L13953)

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

Defined in: [neurolink.ts:13990](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L13990)

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

Defined in: [neurolink.ts:14038](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L14038)

Get the currently configured authentication provider

##### Returns

[`AuthProvider`](../type-aliases/AuthProvider.md) \| `undefined`

---

#### setAuthContext()

> **setAuthContext**(`context`): `Promise`\<`void`\>

Defined in: [neurolink.ts:14079](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L14079)

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

Defined in: [neurolink.ts:14094](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L14094)

Get the current authentication context.

Checks AsyncLocalStorage first, then falls back to the global holder.

##### Returns

`Promise`\<[`AuthenticatedContext`](../type-aliases/AuthenticatedContext.md) \| `undefined`\>

---

#### clearAuthContext()

> **clearAuthContext**(): `Promise`\<`void`\>

Defined in: [neurolink.ts:14102](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L14102)

Clear the current authentication context

##### Returns

`Promise`\<`void`\>

---

#### getExternalServerManager()

> **getExternalServerManager**(): [`ExternalServerManager`](ExternalServerManager.md)

Defined in: [neurolink.ts:14116](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/neurolink.ts#L14116)

Get the external server manager instance
Used internally by server adapters for external MCP server management

##### Returns

[`ExternalServerManager`](ExternalServerManager.md)

The ExternalServerManager instance
