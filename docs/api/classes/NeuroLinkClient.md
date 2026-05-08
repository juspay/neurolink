[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / NeuroLinkClient

# Class: NeuroLinkClient

Defined in: [client/httpClient.ts:137](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/httpClient.ts#L137)

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

Defined in: [client/httpClient.ts:145](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/httpClient.ts#L145)

#### Parameters

##### config

[`ClientConfig`](../type-aliases/ClientConfig.md)

#### Returns

`NeuroLinkClient`

## Methods

### use()

> **use**(`middleware`): `this`

Defined in: [client/httpClient.ts:188](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/httpClient.ts#L188)

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

Defined in: [client/httpClient.ts:196](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/httpClient.ts#L196)

Clear all middleware

#### Returns

`this`

---

### generate()

> **generate**(`options`, `requestOptions?`): `Promise`\<[`ClientApiResponse`](../type-aliases/ClientApiResponse.md)\<[`ClientGenerateResponse`](../type-aliases/ClientGenerateResponse.md)\>\>

Defined in: [client/httpClient.ts:485](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/httpClient.ts#L485)

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

Defined in: [client/httpClient.ts:506](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/httpClient.ts#L506)

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

Defined in: [client/httpClient.ts:686](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/httpClient.ts#L686)

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

Defined in: [client/httpClient.ts:701](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/httpClient.ts#L701)

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

Defined in: [client/httpClient.ts:720](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/httpClient.ts#L720)

List available agents

#### Parameters

##### requestOptions?

[`ClientRequestOptions`](../type-aliases/ClientRequestOptions.md)

#### Returns

`Promise`\<[`ClientApiResponse`](../type-aliases/ClientApiResponse.md)\<[`ClientAgentInfo`](../type-aliases/ClientAgentInfo.md)[]\>\>

---

### getAgent()

> **getAgent**(`agentId`, `requestOptions?`): `Promise`\<[`ClientApiResponse`](../type-aliases/ClientApiResponse.md)\<[`ClientAgentInfo`](../type-aliases/ClientAgentInfo.md)\>\>

Defined in: [client/httpClient.ts:729](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/httpClient.ts#L729)

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

Defined in: [client/httpClient.ts:764](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/httpClient.ts#L764)

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

Defined in: [client/httpClient.ts:779](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/httpClient.ts#L779)

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

Defined in: [client/httpClient.ts:796](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/httpClient.ts#L796)

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

Defined in: [client/httpClient.ts:812](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/httpClient.ts#L812)

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

Defined in: [client/httpClient.ts:828](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/httpClient.ts#L828)

List available workflows

#### Parameters

##### requestOptions?

[`ClientRequestOptions`](../type-aliases/ClientRequestOptions.md)

#### Returns

`Promise`\<[`ClientApiResponse`](../type-aliases/ClientApiResponse.md)\<[`ClientWorkflowInfo`](../type-aliases/ClientWorkflowInfo.md)[]\>\>

---

### getWorkflow()

> **getWorkflow**(`workflowId`, `requestOptions?`): `Promise`\<[`ClientApiResponse`](../type-aliases/ClientApiResponse.md)\<[`ClientWorkflowInfo`](../type-aliases/ClientWorkflowInfo.md)\>\>

Defined in: [client/httpClient.ts:837](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/httpClient.ts#L837)

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

Defined in: [client/httpClient.ts:862](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/httpClient.ts#L862)

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

Defined in: [client/httpClient.ts:886](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/httpClient.ts#L886)

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

Defined in: [client/httpClient.ts:902](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/httpClient.ts#L902)

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

Defined in: [client/httpClient.ts:921](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/httpClient.ts#L921)

List available providers

#### Parameters

##### requestOptions?

[`ClientRequestOptions`](../type-aliases/ClientRequestOptions.md)

#### Returns

`Promise`\<[`ClientApiResponse`](../type-aliases/ClientApiResponse.md)\<[`ClientProviderStatus`](../type-aliases/ClientProviderStatus.md)[]\>\>

---

### getProviderStatus()

> **getProviderStatus**(`providerName`, `requestOptions?`): `Promise`\<[`ClientApiResponse`](../type-aliases/ClientApiResponse.md)\<[`ClientProviderStatus`](../type-aliases/ClientProviderStatus.md)\>\>

Defined in: [client/httpClient.ts:930](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/httpClient.ts#L930)

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

Defined in: [client/httpClient.ts:949](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/httpClient.ts#L949)

Health check

#### Parameters

##### requestOptions?

[`ClientRequestOptions`](../type-aliases/ClientRequestOptions.md)

#### Returns

`Promise`\<[`ClientApiResponse`](../type-aliases/ClientApiResponse.md)\<\{ `status`: `string`; `version`: `string`; \}\>\>

---

### connectWebSocket()

> **connectWebSocket**(`options?`): `void`

Defined in: [client/httpClient.ts:974](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/httpClient.ts#L974)

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

Defined in: [client/httpClient.ts:1043](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/httpClient.ts#L1043)

Disconnect WebSocket

#### Returns

`void`

---

### sendWebSocketMessage()

> **sendWebSocketMessage**(`data`): `void`

Defined in: [client/httpClient.ts:1054](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/httpClient.ts#L1054)

Send message over WebSocket

#### Parameters

##### data

`unknown`

#### Returns

`void`

---

### onWebSocketMessage()

> **onWebSocketMessage**(`messageType`, `handler`): () => `void`

Defined in: [client/httpClient.ts:1065](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/httpClient.ts#L1065)

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

Defined in: [client/httpClient.ts:1086](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/httpClient.ts#L1086)

Get WebSocket connection state

#### Returns

[`ClientWebSocketState`](../type-aliases/ClientWebSocketState.md)

---

### updateConfig()

> **updateConfig**(`config`): `void`

Defined in: [client/httpClient.ts:1097](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/httpClient.ts#L1097)

Update client configuration

#### Parameters

##### config

`Partial`\<[`ClientConfig`](../type-aliases/ClientConfig.md)\>

#### Returns

`void`

---

### getConfig()

> **getConfig**(): `Readonly`\<[`ClientConfig`](../type-aliases/ClientConfig.md)\>

Defined in: [client/httpClient.ts:1124](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/httpClient.ts#L1124)

Get current configuration (readonly)

#### Returns

`Readonly`\<[`ClientConfig`](../type-aliases/ClientConfig.md)\>
