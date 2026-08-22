[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / NetworkWorkflow

# Type Alias: NetworkWorkflow

> **NetworkWorkflow** = `object`

Defined in: [types/agentNetwork.ts:212](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L212)

Workflow definition for network integration

## Methods

### execute()

> **execute**(`input`): `Promise`\<\{ `output`: `unknown`; \}\>

Defined in: [types/agentNetwork.ts:214](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L214)

Execute the workflow with given input

#### Parameters

##### input

`unknown`

#### Returns

`Promise`\<\{ `output`: `unknown`; \}\>

---

### stream()?

> `optional` **stream**(`input`): `AsyncIterable`\<`unknown`\>

Defined in: [types/agentNetwork.ts:217](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L217)

Optional streaming support

#### Parameters

##### input

`unknown`

#### Returns

`AsyncIterable`\<`unknown`\>
