[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NeuroLinkClient

# Class: NeuroLinkClient

HTTP Client for NeuroLink API

Provides type-safe access to all NeuroLink API endpoints with
built-in authentication, retry logic, and middleware support.

## Examples

```typescript
import { createClient } from "@neurolink/client";

const client = createClient({
  baseUrl: "https://api.neurolink.example.com",
  apiKey: "your-api-key",
});

const result = await client.generate({
  input: { text: "Hello, world!" },
  provider: "openai",
});
```

```typescript
const client = createClient({ baseUrl: "https://api.example.com" });

client.use(async (request, next) => {
  console.log("Request:", request.url);
  const response = await next();
  console.log("Response:", response.status);
  return response;
});
```

## Constructors

### Constructor

> **new NeuroLinkClient**(`config`): `NeuroLinkClient`

#### Parameters

##### config

[`ClientConfig`](../type-aliases/ClientConfig.md)

#### Returns

`NeuroLinkClient`

## Methods

### use()

> **use**(`middleware`): `this`

Add middleware to the client

#### Parameters

##### middleware

[`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

ClientMiddleware function

#### Returns

`this`

Client instance for chaining

---

### clearMiddleware()

> **clearMiddleware**(): `this`

Clear all middleware

#### Returns

`this`

---

### generate()

> **generate**(`options`, `requestOptions?`): `Promise`\<[`ClientApiResponse`](../type-aliases/ClientApiResponse.md)\<[`ClientGenerateResponse`](../type-aliases/ClientGenerateResponse.md)\>\>

Generate text using AI models

#### Parameters

##### options

[`ClientGenerateRequestOptions`](../type-aliases/ClientGenerateRequestOptions.md)

##### requestOptions?

[`ClientRequestOptions`](../type-aliases/ClientRequestOptions.md)

#### Returns

`Promise`\<[`ClientApiResponse`](../type-aliases/ClientApiResponse.md)\<[`ClientGenerateResponse`](../type-aliases/ClientGenerateResponse.md)\>\>

#### Example

```typescript
const response = await client.generate({
  input: { text: "Write a poem about coding" },
  provider: "openai",
  model: "gpt-4o",
  temperature: 0.7,
});
console.log(response.data.content);
```

---

### stream()

> **stream**(`options`, `callbacks?`, `requestOptions?`): `Promise`\<[`ClientStreamResult`](../type-aliases/ClientStreamResult.md)\>

Stream text generation

#### Parameters

##### options

[`ClientGenerateRequestOptions`](../type-aliases/ClientGenerateRequestOptions.md) \| [`ClientStreamRequestOptions`](../type-aliases/ClientStreamRequestOptions.md)

##### callbacks?

[`ClientStreamCallbacks`](../type-aliases/ClientStreamCallbacks.md)

##### requestOptions?

[`ClientRequestOptions`](../type-aliases/ClientRequestOptions.md)

#### Returns

`Promise`\<[`ClientStreamResult`](../type-aliases/ClientStreamResult.md)\>

#### Example

```typescript
await client.stream(
  { input: { text: "Tell me a story" }, provider: "openai" },
  {
    onText: (text) => process.stdout.write(text),
    onDone: (result) => console.log("\nDone!", result.usage),
  },
);
```

---

### executeAgent()

> **executeAgent**(`options`, `requestOptions?`): `Promise`\<[`ClientApiResponse`](../type-aliases/ClientApiResponse.md)\<[`ClientAgentExecuteResult`](../type-aliases/ClientAgentExecuteResult.md)\>\>

Execute an agent

#### Parameters

##### options

[`ClientAgentExecuteOptions`](../type-aliases/ClientAgentExecuteOptions.md)

##### requestOptions?

[`ClientRequestOptions`](../type-aliases/ClientRequestOptions.md)

#### Returns

`Promise`\<[`ClientApiResponse`](../type-aliases/ClientApiResponse.md)\<[`ClientAgentExecuteResult`](../type-aliases/ClientAgentExecuteResult.md)\>\>

#### Example

```typescript
const result = await client.executeAgent({
  agentId: "customer-support",
  input: "I need help with my order",
  sessionId: "user-123",
});
console.log(result.data.content);
```

---

### streamAgent()

> **streamAgent**(`options`, `callbacks?`, `requestOptions?`): `Promise`\<[`ClientStreamResult`](../type-aliases/ClientStreamResult.md)\>

Stream agent execution

#### Parameters

##### options

[`ClientAgentExecuteOptions`](../type-aliases/ClientAgentExecuteOptions.md)

##### callbacks?

[`ClientStreamCallbacks`](../type-aliases/ClientStreamCallbacks.md)

##### requestOptions?

[`ClientRequestOptions`](../type-aliases/ClientRequestOptions.md)

#### Returns

`Promise`\<[`ClientStreamResult`](../type-aliases/ClientStreamResult.md)\>

---

### listAgents()

> **listAgents**(`requestOptions?`): `Promise`\<[`ClientApiResponse`](../type-aliases/ClientApiResponse.md)\<[`ClientAgentInfo`](../type-aliases/ClientAgentInfo.md)[]\>\>

List available agents

#### Parameters

##### requestOptions?

[`ClientRequestOptions`](../type-aliases/ClientRequestOptions.md)

#### Returns

`Promise`\<[`ClientApiResponse`](../type-aliases/ClientApiResponse.md)\<[`ClientAgentInfo`](../type-aliases/ClientAgentInfo.md)[]\>\>

---

### getAgent()

> **getAgent**(`agentId`, `requestOptions?`): `Promise`\<[`ClientApiResponse`](../type-aliases/ClientApiResponse.md)\<[`ClientAgentInfo`](../type-aliases/ClientAgentInfo.md)\>\>

Get agent details

#### Parameters

##### agentId

`string`

##### requestOptions?

[`ClientRequestOptions`](../type-aliases/ClientRequestOptions.md)

#### Returns

`Promise`\<[`ClientApiResponse`](../type-aliases/ClientApiResponse.md)\<[`ClientAgentInfo`](../type-aliases/ClientAgentInfo.md)\>\>

---

### executeWorkflow()

> **executeWorkflow**(`options`, `requestOptions?`): `Promise`\<[`ClientApiResponse`](../type-aliases/ClientApiResponse.md)\<[`ClientWorkflowExecuteResult`](../type-aliases/ClientWorkflowExecuteResult.md)\>\>

Execute a workflow

#### Parameters

##### options

[`ClientWorkflowExecuteOptions`](../type-aliases/ClientWorkflowExecuteOptions.md)

##### requestOptions?

[`ClientRequestOptions`](../type-aliases/ClientRequestOptions.md)

#### Returns

`Promise`\<[`ClientApiResponse`](../type-aliases/ClientApiResponse.md)\<[`ClientWorkflowExecuteResult`](../type-aliases/ClientWorkflowExecuteResult.md)\>\>

#### Example

```typescript
const result = await client.executeWorkflow({
  workflowId: 'data-pipeline',
  input: { data: [...] },
});

if (result.data.status === 'running') {
  // Poll for completion
  const status = await client.getWorkflowStatus(
    'data-pipeline',
    result.data.runId
  );
}
```

---

### resumeWorkflow()

> **resumeWorkflow**(`workflowId`, `resumeToken`, `resumeData?`, `requestOptions?`): `Promise`\<[`ClientApiResponse`](../type-aliases/ClientApiResponse.md)\<[`ClientWorkflowExecuteResult`](../type-aliases/ClientWorkflowExecuteResult.md)\>\>

Resume a suspended workflow

#### Parameters

##### workflowId

`string`

##### resumeToken

`string`

##### resumeData?

[`UnknownRecord`](../type-aliases/UnknownRecord.md)

##### requestOptions?

[`ClientRequestOptions`](../type-aliases/ClientRequestOptions.md)

#### Returns

`Promise`\<[`ClientApiResponse`](../type-aliases/ClientApiResponse.md)\<[`ClientWorkflowExecuteResult`](../type-aliases/ClientWorkflowExecuteResult.md)\>\>

---

### getWorkflowStatus()

> **getWorkflowStatus**(`workflowId`, `runId`, `requestOptions?`): `Promise`\<[`ClientApiResponse`](../type-aliases/ClientApiResponse.md)\<[`ClientWorkflowExecuteResult`](../type-aliases/ClientWorkflowExecuteResult.md)\>\>

Get workflow execution status

#### Parameters

##### workflowId

`string`

##### runId

`string`

##### requestOptions?

[`ClientRequestOptions`](../type-aliases/ClientRequestOptions.md)

#### Returns

`Promise`\<[`ClientApiResponse`](../type-aliases/ClientApiResponse.md)\<[`ClientWorkflowExecuteResult`](../type-aliases/ClientWorkflowExecuteResult.md)\>\>

---

### cancelWorkflow()

> **cancelWorkflow**(`workflowId`, `runId`, `requestOptions?`): `Promise`\<[`ClientApiResponse`](../type-aliases/ClientApiResponse.md)\<\{ `success`: `boolean`; \}\>\>

Cancel workflow execution

#### Parameters

##### workflowId

`string`

##### runId

`string`

##### requestOptions?

[`ClientRequestOptions`](../type-aliases/ClientRequestOptions.md)

#### Returns

`Promise`\<[`ClientApiResponse`](../type-aliases/ClientApiResponse.md)\<\{ `success`: `boolean`; \}\>\>

---

### listWorkflows()

> **listWorkflows**(`requestOptions?`): `Promise`\<[`ClientApiResponse`](../type-aliases/ClientApiResponse.md)\<[`ClientWorkflowInfo`](../type-aliases/ClientWorkflowInfo.md)[]\>\>

List available workflows

#### Parameters

##### requestOptions?

[`ClientRequestOptions`](../type-aliases/ClientRequestOptions.md)

#### Returns

`Promise`\<[`ClientApiResponse`](../type-aliases/ClientApiResponse.md)\<[`ClientWorkflowInfo`](../type-aliases/ClientWorkflowInfo.md)[]\>\>

---

### getWorkflow()

> **getWorkflow**(`workflowId`, `requestOptions?`): `Promise`\<[`ClientApiResponse`](../type-aliases/ClientApiResponse.md)\<[`ClientWorkflowInfo`](../type-aliases/ClientWorkflowInfo.md)\>\>

Get workflow details

#### Parameters

##### workflowId

`string`

##### requestOptions?

[`ClientRequestOptions`](../type-aliases/ClientRequestOptions.md)

#### Returns

`Promise`\<[`ClientApiResponse`](../type-aliases/ClientApiResponse.md)\<[`ClientWorkflowInfo`](../type-aliases/ClientWorkflowInfo.md)\>\>

---

### listTools()

> **listTools**(`options?`, `requestOptions?`): `Promise`\<[`ClientApiResponse`](../type-aliases/ClientApiResponse.md)\<[`ClientToolInfo`](../type-aliases/ClientToolInfo.md)[]\>\>

List available tools

#### Parameters

##### options?

###### category?

`string`

###### serverId?

`string`

##### requestOptions?

[`ClientRequestOptions`](../type-aliases/ClientRequestOptions.md)

#### Returns

`Promise`\<[`ClientApiResponse`](../type-aliases/ClientApiResponse.md)\<[`ClientToolInfo`](../type-aliases/ClientToolInfo.md)[]\>\>

#### Example

```typescript
const tools = await client.listTools({ category: "data" });
console.log(tools.data);
```

---

### executeTool()

> **executeTool**(`toolName`, `params`, `requestOptions?`): `Promise`\<[`ClientApiResponse`](../type-aliases/ClientApiResponse.md)\<`unknown`\>\>

Execute a tool

#### Parameters

##### toolName

`string`

##### params

[`UnknownRecord`](../type-aliases/UnknownRecord.md)

##### requestOptions?

[`ClientRequestOptions`](../type-aliases/ClientRequestOptions.md)

#### Returns

`Promise`\<[`ClientApiResponse`](../type-aliases/ClientApiResponse.md)\<`unknown`\>\>

---

### getTool()

> **getTool**(`toolName`, `requestOptions?`): `Promise`\<[`ClientApiResponse`](../type-aliases/ClientApiResponse.md)\<[`ClientToolInfo`](../type-aliases/ClientToolInfo.md)\>\>

Get tool details

#### Parameters

##### toolName

`string`

##### requestOptions?

[`ClientRequestOptions`](../type-aliases/ClientRequestOptions.md)

#### Returns

`Promise`\<[`ClientApiResponse`](../type-aliases/ClientApiResponse.md)\<[`ClientToolInfo`](../type-aliases/ClientToolInfo.md)\>\>

---

### listProviders()

> **listProviders**(`requestOptions?`): `Promise`\<[`ClientApiResponse`](../type-aliases/ClientApiResponse.md)\<[`ClientProviderStatus`](../type-aliases/ClientProviderStatus.md)[]\>\>

List available providers

#### Parameters

##### requestOptions?

[`ClientRequestOptions`](../type-aliases/ClientRequestOptions.md)

#### Returns

`Promise`\<[`ClientApiResponse`](../type-aliases/ClientApiResponse.md)\<[`ClientProviderStatus`](../type-aliases/ClientProviderStatus.md)[]\>\>

---

### getProviderStatus()

> **getProviderStatus**(`providerName`, `requestOptions?`): `Promise`\<[`ClientApiResponse`](../type-aliases/ClientApiResponse.md)\<[`ClientProviderStatus`](../type-aliases/ClientProviderStatus.md)\>\>

Get provider status

#### Parameters

##### providerName

`string`

##### requestOptions?

[`ClientRequestOptions`](../type-aliases/ClientRequestOptions.md)

#### Returns

`Promise`\<[`ClientApiResponse`](../type-aliases/ClientApiResponse.md)\<[`ClientProviderStatus`](../type-aliases/ClientProviderStatus.md)\>\>

---

### health()

> **health**(`requestOptions?`): `Promise`\<[`ClientApiResponse`](../type-aliases/ClientApiResponse.md)\<\{ `status`: `string`; `version`: `string`; \}\>\>

Health check

#### Parameters

##### requestOptions?

[`ClientRequestOptions`](../type-aliases/ClientRequestOptions.md)

#### Returns

`Promise`\<[`ClientApiResponse`](../type-aliases/ClientApiResponse.md)\<\{ `status`: `string`; `version`: `string`; \}\>\>

---

### connectWebSocket()

> **connectWebSocket**(`options?`): `void`

Connect to WebSocket for real-time communication

#### Parameters

##### options?

`Partial`\<[`ClientWebSocketOptions`](../type-aliases/ClientWebSocketOptions.md)\>

#### Returns

`void`

#### Example

```typescript
client.connectWebSocket({
  url: "wss://api.example.com/ws",
  autoReconnect: true,
});

client.onWebSocketMessage("chat", (data) => {
  console.log("Chat message:", data);
});
```

---

### disconnectWebSocket()

> **disconnectWebSocket**(): `void`

Disconnect WebSocket

#### Returns

`void`

---

### sendWebSocketMessage()

> **sendWebSocketMessage**(`data`): `void`

Send message over WebSocket

#### Parameters

##### data

`unknown`

#### Returns

`void`

---

### onWebSocketMessage()

> **onWebSocketMessage**(`messageType`, `handler`): () => `void`

Register WebSocket message handler

#### Parameters

##### messageType

`string`

##### handler

[`ClientWebSocketMessageHandler`](../type-aliases/ClientWebSocketMessageHandler.md)

#### Returns

() => `void`

---

### getWebSocketState()

> **getWebSocketState**(): [`ClientWebSocketState`](../type-aliases/ClientWebSocketState.md)

Get WebSocket connection state

#### Returns

[`ClientWebSocketState`](../type-aliases/ClientWebSocketState.md)

---

### updateConfig()

> **updateConfig**(`config`): `void`

Update client configuration

#### Parameters

##### config

`Partial`\<[`ClientConfig`](../type-aliases/ClientConfig.md)\>

#### Returns

`void`

---

### getConfig()

> **getConfig**(): `Readonly`\<[`ClientConfig`](../type-aliases/ClientConfig.md)\>

Get current configuration (readonly)

#### Returns

`Readonly`\<[`ClientConfig`](../type-aliases/ClientConfig.md)\>
