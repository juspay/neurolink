[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgentNetwork

# Class: AgentNetwork

Defined in: [agent/agentNetwork.ts:65](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/agentNetwork.ts#L65)

AgentNetwork - Multi-agent orchestration using the ai SDK tool loop

Each agent in the network is registered as an ai SDK `tool()`. A single
`neurolink.generate()` call with `maxSteps` acts as the router: the model
picks which agent tool(s) to call, the SDK executes them and feeds results
back, and the loop continues until the model emits `finishReason: "stop"` or
maxSteps is exhausted.

## Example

```typescript
const network = neurolink.createNetwork({
  name: "Content Team",
  agents: [researchAgent, writerAgent, reviewerAgent],
  router: { model: "gpt-4o" },
});

const result = await network.execute({
  message: "Write an article about AI trends",
});
```

## Constructors

### Constructor

> **new AgentNetwork**(`config`, `neurolink`): `AgentNetwork`

Defined in: [agent/agentNetwork.ts:81](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/agentNetwork.ts#L81)

#### Parameters

##### config

[`AgentNetworkConfig`](../type-aliases/AgentNetworkConfig.md)

##### neurolink

[`NeuroLink`](NeuroLink.md)

#### Returns

`AgentNetwork`

## Properties

### id

> `readonly` **id**: `string`

Defined in: [agent/agentNetwork.ts:66](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/agentNetwork.ts#L66)

---

### name

> `readonly` **name**: `string`

Defined in: [agent/agentNetwork.ts:67](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/agentNetwork.ts#L67)

---

### description?

> `readonly` `optional` **description?**: `string`

Defined in: [agent/agentNetwork.ts:68](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/agentNetwork.ts#L68)

## Methods

### execute()

> **execute**(`input`, `options?`): `Promise`\<[`NetworkExecutionResult`](../type-aliases/NetworkExecutionResult.md)\>

Defined in: [agent/agentNetwork.ts:378](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/agentNetwork.ts#L378)

Execute the network with intelligent routing via the ai SDK tool loop.

A single `neurolink.generate()` call is issued. The model decides which
agent tool(s) to call; the SDK executes them and loops until `stop` or
`maxSteps` is reached.

#### Parameters

##### input

[`NetworkExecutionInput`](../type-aliases/NetworkExecutionInput.md)

##### options?

[`NetworkExecutionOptions`](../type-aliases/NetworkExecutionOptions.md)

#### Returns

`Promise`\<[`NetworkExecutionResult`](../type-aliases/NetworkExecutionResult.md)\>

---

### stream()

> **stream**(`input`, `options?`): `AsyncIterable`\<[`NetworkStreamChunk`](../type-aliases/NetworkStreamChunk.md)\>

Defined in: [agent/agentNetwork.ts:467](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/agentNetwork.ts#L467)

Stream network execution using the ai SDK tool loop.

Calls `neurolink.stream()` with agent tools. Text chunks, tool calls, and
tool results are forwarded as typed NetworkStreamChunk events.

#### Parameters

##### input

[`NetworkExecutionInput`](../type-aliases/NetworkExecutionInput.md)

##### options?

[`NetworkExecutionOptions`](../type-aliases/NetworkExecutionOptions.md)

#### Returns

`AsyncIterable`\<[`NetworkStreamChunk`](../type-aliases/NetworkStreamChunk.md)\>

---

### getAgent()

> **getAgent**(`id`): [`Agent`](Agent.md) \| `undefined`

Defined in: [agent/agentNetwork.ts:597](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/agentNetwork.ts#L597)

#### Parameters

##### id

`string`

#### Returns

[`Agent`](Agent.md) \| `undefined`

---

### getAllAgents()

> **getAllAgents**(): [`Agent`](Agent.md)[]

Defined in: [agent/agentNetwork.ts:601](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/agentNetwork.ts#L601)

#### Returns

[`Agent`](Agent.md)[]

---

### getAllPrimitives()

> **getAllPrimitives**(): [`Primitive`](../type-aliases/Primitive.md)[]

Defined in: [agent/agentNetwork.ts:605](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/agentNetwork.ts#L605)

#### Returns

[`Primitive`](../type-aliases/Primitive.md)[]

---

### on()

> **on**(`event`, `handler`): `void`

Defined in: [agent/agentNetwork.ts:609](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/agentNetwork.ts#L609)

#### Parameters

##### event

`string`

##### handler

(...`args`) => `void`

#### Returns

`void`

---

### off()

> **off**(`event`, `handler`): `void`

Defined in: [agent/agentNetwork.ts:613](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/agentNetwork.ts#L613)

#### Parameters

##### event

`string`

##### handler

(...`args`) => `void`

#### Returns

`void`
