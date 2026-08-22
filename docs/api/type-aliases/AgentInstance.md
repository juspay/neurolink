[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgentInstance

# Type Alias: AgentInstance

> **AgentInstance** = `object`

Defined in: [types/agentNetwork.ts:608](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L608)

Interface for agent instances

## Properties

### id

> `readonly` **id**: `string`

Defined in: [types/agentNetwork.ts:610](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L610)

Agent ID

---

### name

> `readonly` **name**: `string`

Defined in: [types/agentNetwork.ts:613](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L613)

Agent name

---

### description

> `readonly` **description**: `string`

Defined in: [types/agentNetwork.ts:616](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L616)

Agent description

---

### instructions

> `readonly` **instructions**: `string`

Defined in: [types/agentNetwork.ts:619](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L619)

Agent instructions

## Methods

### execute()

> **execute**(`input`, `options?`): `Promise`\<[`AgentResult`](AgentResult.md)\>

Defined in: [types/agentNetwork.ts:622](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L622)

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

Defined in: [types/agentNetwork.ts:628](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L628)

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

Defined in: [types/agentNetwork.ts:634](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L634)

Get agent status

#### Returns

[`AgentStatus`](AgentStatus.md)
