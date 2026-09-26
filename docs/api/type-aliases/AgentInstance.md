[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgentInstance

# Type Alias: AgentInstance

> **AgentInstance** = `object`

Interface for agent instances

## Properties

### id

> `readonly` **id**: `string`

Agent ID

---

### name

> `readonly` **name**: `string`

Agent name

---

### description

> `readonly` **description**: `string`

Agent description

---

### instructions

> `readonly` **instructions**: `string`

Agent instructions

## Methods

### execute()

> **execute**(`input`, `options?`): `Promise`\<[`AgentResult`](AgentResult.md)\>

Execute the agent

#### Parameters

##### input

[`AgentInput`](AgentInput.md)

##### options?

[`AgentExecutionOptions`](AgentExecutionOptions.md)

#### Returns

`Promise`\<[`AgentResult`](AgentResult.md)\>

---

### stream()

> **stream**(`input`, `options?`): `AsyncIterable`\<[`AgentStreamChunk`](AgentStreamChunk.md)\>

Stream execution results

#### Parameters

##### input

[`AgentInput`](AgentInput.md)

##### options?

[`AgentExecutionOptions`](AgentExecutionOptions.md)

#### Returns

`AsyncIterable`\<[`AgentStreamChunk`](AgentStreamChunk.md)\>

---

### getStatus()

> **getStatus**(): [`AgentStatus`](AgentStatus.md)

Get agent status

#### Returns

[`AgentStatus`](AgentStatus.md)
