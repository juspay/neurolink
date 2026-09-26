[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgentNetwork

# Class: AgentNetwork

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

---

### name

> `readonly` **name**: `string`

---

### description?

> `readonly` `optional` **description?**: `string`

## Methods

### execute()

> **execute**(`input`, `options?`): `Promise`\<[`NetworkExecutionResult`](../type-aliases/NetworkExecutionResult.md)\>

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

#### Parameters

##### id

`string`

#### Returns

[`Agent`](Agent.md) \| `undefined`

---

### getAllAgents()

> **getAllAgents**(): [`Agent`](Agent.md)[]

#### Returns

[`Agent`](Agent.md)[]

---

### getAllPrimitives()

> **getAllPrimitives**(): [`Primitive`](../type-aliases/Primitive.md)[]

#### Returns

[`Primitive`](../type-aliases/Primitive.md)[]

---

### on()

> **on**(`event`, `handler`): `void`

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

#### Parameters

##### event

`string`

##### handler

(...`args`) => `void`

#### Returns

`void`
