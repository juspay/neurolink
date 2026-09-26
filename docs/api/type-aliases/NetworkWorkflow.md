[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NetworkWorkflow

# Type Alias: NetworkWorkflow

> **NetworkWorkflow** = `object`

Workflow definition for network integration

## Methods

### execute()

> **execute**(`input`): `Promise`\<\{ `output`: `unknown`; \}\>

Execute the workflow with given input

#### Parameters

##### input

`unknown`

#### Returns

`Promise`\<\{ `output`: `unknown`; \}\>

---

### stream()?

> `optional` **stream**(`input`): `AsyncIterable`\<`unknown`\>

Optional streaming support

#### Parameters

##### input

`unknown`

#### Returns

`AsyncIterable`\<`unknown`\>
