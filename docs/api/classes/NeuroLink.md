[**NeuroLink API Reference v8.32.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / NeuroLink

# Class: NeuroLink

Defined in: [neurolink.ts:221](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/neurolink.ts#L221)

NeuroLink - Universal AI Development Platform

Main SDK class providing unified access to 14+ AI providers with enterprise features:

- Multi-provider support (OpenAI, Anthropic, Google AI Studio, Google Vertex, AWS Bedrock, etc.)
- MCP (Model Context Protocol) tool integration with 58+ external servers
- Human-in-the-Loop (HITL) security workflows for regulated industries
- Redis-based conversation memory and persistence
- Enterprise middleware system for monitoring and control
- Automatic provider fallback and retry logic
- Streaming with real-time token delivery
- Multimodal support (text, images, PDFs, CSV)

## Examples

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Explain quantum computing" },
  provider: "vertex",
  model: "gemini-3-flash",
});

console.log(result.content);
```

```typescript
const neurolink = new NeuroLink({
  hitl: {
    enabled: true,
    requireApproval: ["writeFile", "executeCode"],
    confidenceThreshold: 0.85,
  },
});
```

```typescript
const neurolink = new NeuroLink({
  conversationMemory: {
    enabled: true,
    redis: {
      url: "redis://localhost:6379",
    },
  },
});
```

```typescript
const neurolink = new NeuroLink();

// Discover available tools
const tools = await neurolink.getAvailableTools();

// Use tools in generation
const result = await neurolink.generate({
  input: { text: "Read the README.md file" },
  tools: ["readFile"],
});
```

## See

- [GenerateOptions](../type-aliases/GenerateOptions.md) for generation options
- [StreamOptions](#) for streaming options
- [NeurolinkConstructorConfig](#) for configuration options

## Since

1.0.0

## Constructors

### Constructor

> **new NeuroLink**(`config?`): `NeuroLink`

Defined in: [neurolink.ts:440](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/neurolink.ts#L440)

#### Parameters

##### config?

[`NeurolinkConstructorConfig`](#)

#### Returns

`NeuroLink`

## Properties

### conversationMemory?

> `optional` **conversationMemory**: `ConversationMemoryManager` \| `RedisConversationMemoryManager` \| `null`

Defined in: [neurolink.ts:286](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/neurolink.ts#L286)

## Methods

### Generation

#### generate()

> **generate**(`optionsOrPrompt`): `Promise`\<[`GenerateResult`](../type-aliases/GenerateResult.md)\>

Defined in: [neurolink.ts:1826](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/neurolink.ts#L1826)

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

Generation options or simple text prompt

`string` | [`GenerateOptions`](../type-aliases/GenerateOptions.md)

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

Defined in: [neurolink.ts:1656](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/neurolink.ts#L1656)

Get observability configuration

##### Returns

[`ObservabilityConfig`](../type-aliases/ObservabilityConfig.md) \| `undefined`

---

#### isTelemetryEnabled()

> **isTelemetryEnabled**(): `boolean`

Defined in: [neurolink.ts:1664](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/neurolink.ts#L1664)

Check if Langfuse telemetry is enabled
Centralized utility to avoid duplication across providers

##### Returns

`boolean`

---

#### initializeLangfuseObservability()

> **initializeLangfuseObservability**(): `Promise`\<`void`\>

Defined in: [neurolink.ts:1672](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/neurolink.ts#L1672)

Public method to initialize Langfuse observability
This method can be called externally to ensure Langfuse is properly initialized

##### Returns

`Promise`\<`void`\>

---

#### shutdown()

> **shutdown**(): `Promise`\<`void`\>

Defined in: [neurolink.ts:1698](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/neurolink.ts#L1698)

Gracefully shutdown NeuroLink and all MCP connections

##### Returns

`Promise`\<`void`\>

---

#### generateText()

> **generateText**(`options`): `Promise`\<[`TextGenerationResult`](../type-aliases/TextGenerationResult.md)\>

Defined in: [neurolink.ts:2090](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/neurolink.ts#L2090)

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

Defined in: [neurolink.ts:2775](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/neurolink.ts#L2775)

BACKWARD COMPATIBILITY: Legacy streamText method
Internally calls stream() and converts result format

##### Parameters

###### prompt

`string`

###### options?

`Partial`\<[`StreamOptions`](#)\>

##### Returns

`Promise`\<`AsyncIterable`\<`string`, `any`, `any`\>\>

---

#### stream()

> **stream**(`options`): `Promise`\<`StreamResult`\>

Defined in: [neurolink.ts:2855](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/neurolink.ts#L2855)

Stream AI-generated content in real-time using the best available provider.
This method provides real-time streaming of AI responses with full MCP tool integration.

##### Parameters

###### options

[`StreamOptions`](#)

Stream configuration options

##### Returns

`Promise`\<`StreamResult`\>

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

> **getEventEmitter**(): `TypedEventEmitter`\<`NeuroLinkEvents`\>

Defined in: [neurolink.ts:3677](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/neurolink.ts#L3677)

Get the EventEmitter instance to listen to NeuroLink events for real-time monitoring and debugging.
This method provides access to the internal event system that emits events during AI generation,
tool execution, streaming, and other operations for comprehensive observability.

##### Returns

`TypedEventEmitter`\<`NeuroLinkEvents`\>

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
- `generation:end` - Fired when text generation completes
  - `{ provider: string, responseTime: number, toolsUsed?: string[], timestamp: number }`

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

#### emitToolStart()

> **emitToolStart**(`toolName`, `input`, `startTime`): `string`

Defined in: [neurolink.ts:3695](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/neurolink.ts#L3695)

Emit tool start event with execution tracking

##### Parameters

###### toolName

`string`

Name of the tool being executed

###### input

`unknown`

Input parameters for the tool

###### startTime

`number` = `...`

Timestamp when execution started

##### Returns

`string`

executionId for tracking this specific execution

---

#### emitToolEnd()

> **emitToolEnd**(`toolName`, `result?`, `error?`, `startTime?`, `endTime?`, `executionId?`): `void`

Defined in: [neurolink.ts:3744](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/neurolink.ts#L3744)

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

> **getCurrentToolExecutions**(): `ToolExecutionContext`[]

Defined in: [neurolink.ts:3821](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/neurolink.ts#L3821)

Get current tool execution contexts for stream metadata

##### Returns

`ToolExecutionContext`[]

---

#### getToolExecutionHistory()

> **getToolExecutionHistory**(): `ToolExecutionSummary`[]

Defined in: [neurolink.ts:3828](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/neurolink.ts#L3828)

Get tool execution history

##### Returns

`ToolExecutionSummary`[]

---

#### clearCurrentStreamExecutions()

> **clearCurrentStreamExecutions**(): `void`

Defined in: [neurolink.ts:3835](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/neurolink.ts#L3835)

Clear current stream tool executions (called at stream start)

##### Returns

`void`

---

#### registerTool()

> **registerTool**(`name`, `tool`): `void`

Defined in: [neurolink.ts:3851](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/neurolink.ts#L3851)

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

##### Returns

`void`

---

#### setToolContext()

> **setToolContext**(`context`): `void`

Defined in: [neurolink.ts:3928](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/neurolink.ts#L3928)

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

Defined in: [neurolink.ts:3943](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/neurolink.ts#L3943)

Get the current tool execution context

##### Returns

`Record`\<`string`, `unknown`\> \| `undefined`

Current context or undefined if not set

---

#### clearToolContext()

> **clearToolContext**(): `void`

Defined in: [neurolink.ts:3952](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/neurolink.ts#L3952)

Clear the tool execution context

##### Returns

`void`

---

#### registerTools()

> **registerTools**(`tools`): `void`

Defined in: [neurolink.ts:3964](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/neurolink.ts#L3964)

Register multiple tools at once - Supports both object and array formats

##### Parameters

###### tools

Object mapping tool names to MCPExecutableTool format OR Array of tools with names

Object format (existing): { toolName: MCPExecutableTool, ... }
Array format (Lighthouse compatible): [{ name: string, tool: MCPExecutableTool }, ...]

`Record`\<`string`, \{ `name`: `string`; `description`: `string`; `inputSchema?`: `object`; `execute?`: (`params`, `context?`) => `unknown`; \}\> | `object`[]

##### Returns

`void`

---

#### unregisterTool()

> **unregisterTool**(`name`): `boolean`

Defined in: [neurolink.ts:3987](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/neurolink.ts#L3987)

Unregister a custom tool

##### Parameters

###### name

`string`

Name of the tool to remove

##### Returns

`boolean`

true if the tool was removed, false if it didn't exist

---

#### getCustomTools()

> **getCustomTools**(): `Map`\<`string`, \{ `name`: `string`; `description`: `string`; `inputSchema?`: `object`; `execute?`: (`params`, `context?`) => `unknown`; \}\>

Defined in: [neurolink.ts:4001](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/neurolink.ts#L4001)

Get all registered custom tools

##### Returns

`Map`\<`string`, \{ `name`: `string`; `description`: `string`; `inputSchema?`: `object`; `execute?`: (`params`, `context?`) => `unknown`; \}\>

Map of tool names to MCPExecutableTool format

---

#### addInMemoryMCPServer()

> **addInMemoryMCPServer**(`serverId`, `serverInfo`): `Promise`\<`void`\>

Defined in: [neurolink.ts:4094](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/neurolink.ts#L4094)

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

Defined in: [neurolink.ts:4133](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/neurolink.ts#L4133)

Get all registered in-memory servers

##### Returns

`Map`\<`string`, [`MCPServerInfo`](../type-aliases/MCPServerInfo.md)\>

Map of server IDs to MCPServerInfo

---

#### getInMemoryServerInfos()

> **getInMemoryServerInfos**(): [`MCPServerInfo`](../type-aliases/MCPServerInfo.md)[]

Defined in: [neurolink.ts:4157](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/neurolink.ts#L4157)

Get in-memory servers as MCPServerInfo - ZERO conversion needed
Now fetches from centralized tool registry instead of local duplication

##### Returns

[`MCPServerInfo`](../type-aliases/MCPServerInfo.md)[]

Array of MCPServerInfo

---

#### getAutoDiscoveredServerInfos()

> **getAutoDiscoveredServerInfos**(): [`MCPServerInfo`](../type-aliases/MCPServerInfo.md)[]

Defined in: [neurolink.ts:4173](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/neurolink.ts#L4173)

Get auto-discovered servers as MCPServerInfo - ZERO conversion needed

##### Returns

[`MCPServerInfo`](../type-aliases/MCPServerInfo.md)[]

Array of MCPServerInfo

---

#### executeTool()

> **executeTool**\<`T`\>(`toolName`, `params`, `options?`): `Promise`\<`T`\>

Defined in: [neurolink.ts:4185](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/neurolink.ts#L4185)

Execute a specific tool by name with robust error handling
Supports both custom tools and MCP server tools with timeout, retry, and circuit breaker patterns

##### Type Parameters

###### T

`T` = `unknown`

##### Parameters

###### toolName

`string`

Name of the tool to execute

###### params

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

Defined in: [neurolink.ts:4581](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/neurolink.ts#L4581)

##### Returns

`Promise`\<[`ToolInfo`](../type-aliases/ToolInfo.md)[]\>

---

#### getProviderStatus()

> **getProviderStatus**(`options?`): `Promise`\<`ProviderStatus`[]\>

Defined in: [neurolink.ts:4749](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/neurolink.ts#L4749)

Get comprehensive status of all AI providers
Primary method for provider health checking and diagnostics

##### Parameters

###### options?

###### quiet?

`boolean`

##### Returns

`Promise`\<`ProviderStatus`[]\>

---

#### testProvider()

> **testProvider**(`providerName`): `Promise`\<`boolean`\>

Defined in: [neurolink.ts:4940](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/neurolink.ts#L4940)

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

Defined in: [neurolink.ts:4972](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/neurolink.ts#L4972)

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

Defined in: [neurolink.ts:4981](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/neurolink.ts#L4981)

Get list of all available AI provider names

##### Returns

`Promise`\<`string`[]\>

Array of supported provider names

---

#### isValidProvider()

> **isValidProvider**(`providerName`): `Promise`\<`boolean`\>

Defined in: [neurolink.ts:4991](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/neurolink.ts#L4991)

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

> **getMCPStatus**(): `Promise`\<`MCPStatus`\>

Defined in: [neurolink.ts:5004](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/neurolink.ts#L5004)

Get comprehensive MCP (Model Context Protocol) status information

##### Returns

`Promise`\<`MCPStatus`\>

Promise resolving to MCP status details

---

#### listMCPServers()

> **listMCPServers**(): `Promise`\<[`MCPServerInfo`](../type-aliases/MCPServerInfo.md)[]\>

Defined in: [neurolink.ts:5074](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/neurolink.ts#L5074)

List all configured MCP servers with their status

##### Returns

`Promise`\<[`MCPServerInfo`](../type-aliases/MCPServerInfo.md)[]\>

Promise resolving to array of MCP server information

---

#### testMCPServer()

> **testMCPServer**(`serverId`): `Promise`\<`boolean`\>

Defined in: [neurolink.ts:5089](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/neurolink.ts#L5089)

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

Defined in: [neurolink.ts:5130](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/neurolink.ts#L5130)

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

> **checkProviderHealth**(`providerName`, `options`): `Promise`\<\{ `provider`: `string`; `isHealthy`: `boolean`; `isConfigured`: `boolean`; `hasApiKey`: `boolean`; `lastChecked`: `Date`; `error?`: `string`; `warning?`: `string`; `responseTime?`: `number`; `configurationIssues`: `string`[]; `recommendations`: `string`[]; \}\>

Defined in: [neurolink.ts:5153](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/neurolink.ts#L5153)

Perform comprehensive health check on a specific provider

##### Parameters

###### providerName

`string`

Name of the provider to check

###### options

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

> **checkAllProvidersHealth**(`options`): `Promise`\<`object`[]\>

Defined in: [neurolink.ts:5199](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/neurolink.ts#L5199)

Check health of all supported providers

##### Parameters

###### options

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

Defined in: [neurolink.ts:5243](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/neurolink.ts#L5243)

Get a summary of provider health across all supported providers

##### Returns

`Promise`\<\{ `total`: `number`; `healthy`: `number`; `configured`: `number`; `hasIssues`: `number`; `healthyProviders`: `string`[]; `unhealthyProviders`: `string`[]; `recommendations`: `string`[]; \}\>

Promise resolving to health summary statistics

---

#### clearProviderHealthCache()

> **clearProviderHealthCache**(`providerName?`): `Promise`\<`void`\>

Defined in: [neurolink.ts:5290](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/neurolink.ts#L5290)

Clear provider health cache (useful for re-testing after configuration changes)

##### Parameters

###### providerName?

`string`

Optional specific provider to clear cache for

##### Returns

`Promise`\<`void`\>

---

#### getToolExecutionMetrics()

> **getToolExecutionMetrics**(): `Record`\<`string`, \{ `totalExecutions`: `number`; `successfulExecutions`: `number`; `failedExecutions`: `number`; `successRate`: `number`; `averageExecutionTime`: `number`; `lastExecutionTime`: `number`; \}\>

Defined in: [neurolink.ts:5301](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/neurolink.ts#L5301)

Get execution metrics for all tools

##### Returns

`Record`\<`string`, \{ `totalExecutions`: `number`; `successfulExecutions`: `number`; `failedExecutions`: `number`; `successRate`: `number`; `averageExecutionTime`: `number`; `lastExecutionTime`: `number`; \}\>

Object with execution metrics for each tool

---

#### getToolCircuitBreakerStatus()

> **getToolCircuitBreakerStatus**(): `Record`\<`string`, \{ `state`: `"closed"` \| `"open"` \| `"half-open"`; `failureCount`: `number`; `isHealthy`: `boolean`; \}\>

Defined in: [neurolink.ts:5341](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/neurolink.ts#L5341)

Get circuit breaker status for all tools

##### Returns

`Record`\<`string`, \{ `state`: `"closed"` \| `"open"` \| `"half-open"`; `failureCount`: `number`; `isHealthy`: `boolean`; \}\>

Object with circuit breaker status for each tool

---

#### resetToolCircuitBreaker()

> **resetToolCircuitBreaker**(`toolName`): `void`

Defined in: [neurolink.ts:5376](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/neurolink.ts#L5376)

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

Defined in: [neurolink.ts:5393](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/neurolink.ts#L5393)

Clear all tool execution metrics

##### Returns

`void`

---

#### getToolHealthReport()

> **getToolHealthReport**(): `Promise`\<\{ `totalTools`: `number`; `healthyTools`: `number`; `unhealthyTools`: `number`; `tools`: `Record`\<`string`, \{ `name`: `string`; `isHealthy`: `boolean`; `metrics`: \{ `totalExecutions`: `number`; `successRate`: `number`; `averageExecutionTime`: `number`; `lastExecutionTime`: `number`; \}; `circuitBreaker`: \{ `state`: `"closed"` \| `"open"` \| `"half-open"`; `failureCount`: `number`; \}; `issues`: `string`[]; `recommendations`: `string`[]; \}\>; \}\>

Defined in: [neurolink.ts:5402](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/neurolink.ts#L5402)

Get comprehensive tool health report

##### Returns

`Promise`\<\{ `totalTools`: `number`; `healthyTools`: `number`; `unhealthyTools`: `number`; `tools`: `Record`\<`string`, \{ `name`: `string`; `isHealthy`: `boolean`; `metrics`: \{ `totalExecutions`: `number`; `successRate`: `number`; `averageExecutionTime`: `number`; `lastExecutionTime`: `number`; \}; `circuitBreaker`: \{ `state`: `"closed"` \| `"open"` \| `"half-open"`; `failureCount`: `number`; \}; `issues`: `string`[]; `recommendations`: `string`[]; \}\>; \}\>

Detailed health report for all tools

---

#### ensureConversationMemoryInitialized()

> **ensureConversationMemoryInitialized**(): `Promise`\<`boolean`\>

Defined in: [neurolink.ts:5522](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/neurolink.ts#L5522)

Initialize conversation memory if enabled (public method for explicit initialization)
This is useful for testing or when you want to ensure conversation memory is ready

##### Returns

`Promise`\<`boolean`\>

Promise resolving to true if initialization was successful, false otherwise

---

#### getConversationStats()

> **getConversationStats**(): `Promise`\<`ConversationMemoryStats`\>

Defined in: [neurolink.ts:5542](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/neurolink.ts#L5542)

Get conversation memory statistics (public API)

##### Returns

`Promise`\<`ConversationMemoryStats`\>

---

#### getConversationHistory()

> **getConversationHistory**(`sessionId`): `Promise`\<`ChatMessage`[]\>

Defined in: [neurolink.ts:5563](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/neurolink.ts#L5563)

Get complete conversation history for a specific session (public API)

##### Parameters

###### sessionId

`string`

The session ID to retrieve history for

##### Returns

`Promise`\<`ChatMessage`[]\>

Array of ChatMessage objects in chronological order, or empty array if session doesn't exist

---

#### clearConversationSession()

> **clearConversationSession**(`sessionId`): `Promise`\<`boolean`\>

Defined in: [neurolink.ts:5606](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/neurolink.ts#L5606)

Clear conversation history for a specific session (public API)

##### Parameters

###### sessionId

`string`

##### Returns

`Promise`\<`boolean`\>

---

#### clearAllConversations()

> **clearAllConversations**(): `Promise`\<`void`\>

Defined in: [neurolink.ts:5625](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/neurolink.ts#L5625)

Clear all conversation history (public API)

##### Returns

`Promise`\<`void`\>

---

#### storeToolExecutions()

> **storeToolExecutions**(`sessionId`, `userId`, `toolCalls`, `toolResults`, `currentTime?`): `Promise`\<`void`\>

Defined in: [neurolink.ts:5649](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/neurolink.ts#L5649)

Store tool executions in conversation memory if enabled and Redis is configured

##### Parameters

###### sessionId

`string`

Session identifier

###### userId

User identifier (optional)

`string` | `undefined`

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

Defined in: [neurolink.ts:5706](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/neurolink.ts#L5706)

Check if tool execution storage is available

##### Returns

`boolean`

boolean indicating if Redis storage is configured and available

---

#### addExternalMCPServer()

> **addExternalMCPServer**(`serverId`, `config`): `Promise`\<`ExternalMCPOperationResult`\<`ExternalMCPServerInstance`\>\>

Defined in: [neurolink.ts:5725](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/neurolink.ts#L5725)

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

`Promise`\<`ExternalMCPOperationResult`\<`ExternalMCPServerInstance`\>\>

Operation result with server instance

---

#### removeExternalMCPServer()

> **removeExternalMCPServer**(`serverId`): `Promise`\<`ExternalMCPOperationResult`\<`void`\>\>

Defined in: [neurolink.ts:5782](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/neurolink.ts#L5782)

Remove an external MCP server
Stops the server and removes all its tools

##### Parameters

###### serverId

`string`

ID of the server to remove

##### Returns

`Promise`\<`ExternalMCPOperationResult`\<`void`\>\>

Operation result

---

#### listExternalMCPServers()

> **listExternalMCPServers**(): `object`[]

Defined in: [neurolink.ts:5824](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/neurolink.ts#L5824)

List all external MCP servers

##### Returns

`object`[]

Array of server health information

---

#### getExternalMCPServer()

> **getExternalMCPServer**(`serverId`): `ExternalMCPServerInstance` \| `undefined`

Defined in: [neurolink.ts:5853](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/neurolink.ts#L5853)

Get external MCP server status

##### Parameters

###### serverId

`string`

ID of the server

##### Returns

`ExternalMCPServerInstance` \| `undefined`

Server instance or undefined if not found

---

#### executeExternalMCPTool()

> **executeExternalMCPTool**(`serverId`, `toolName`, `parameters`, `options?`): `Promise`\<`unknown`\>

Defined in: [neurolink.ts:5867](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/neurolink.ts#L5867)

Execute a tool from an external MCP server

##### Parameters

###### serverId

`string`

ID of the server

###### toolName

`string`

Name of the tool

###### parameters

`JsonObject`

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

> **getExternalMCPTools**(): `ExternalMCPToolInfo`[]

Defined in: [neurolink.ts:5902](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/neurolink.ts#L5902)

Get all tools from external MCP servers

##### Returns

`ExternalMCPToolInfo`[]

Array of external tool information

---

#### getExternalMCPServerTools()

> **getExternalMCPServerTools**(`serverId`): `ExternalMCPToolInfo`[]

Defined in: [neurolink.ts:5911](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/neurolink.ts#L5911)

Get tools from a specific external MCP server

##### Parameters

###### serverId

`string`

ID of the server

##### Returns

`ExternalMCPToolInfo`[]

Array of tool information for the server

---

#### testExternalMCPConnection()

> **testExternalMCPConnection**(`config`): `Promise`\<`BatchOperationResult`\>

Defined in: [neurolink.ts:5920](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/neurolink.ts#L5920)

Test connection to an external MCP server

##### Parameters

###### config

[`MCPServerInfo`](../type-aliases/MCPServerInfo.md)

Server configuration to test

##### Returns

`Promise`\<`BatchOperationResult`\>

Test result with connection status

---

#### getExternalMCPStatistics()

> **getExternalMCPStatistics**(): `object`

Defined in: [neurolink.ts:5945](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/neurolink.ts#L5945)

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

Defined in: [neurolink.ts:5960](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/neurolink.ts#L5960)

Shutdown all external MCP servers
Called automatically on process exit

##### Returns

`Promise`\<`void`\>

---

#### dispose()

> **dispose**(): `Promise`\<`void`\>

Defined in: [neurolink.ts:6161](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/neurolink.ts#L6161)

Dispose of all resources and cleanup connections
Call this method when done using the NeuroLink instance to prevent resource leaks
Especially important in test environments where multiple instances are created

##### Returns

`Promise`\<`void`\>
