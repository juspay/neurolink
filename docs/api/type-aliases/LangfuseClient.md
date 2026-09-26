[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LangfuseClient

# Type Alias: LangfuseClient

> **LangfuseClient** = `object`

Minimal Langfuse client interface for evaluation hooks.

## Properties

### score

> **score**: (`params`) => `Promise`\<`unknown`\>

#### Parameters

##### params

###### name

`string`

###### value

`number`

###### traceId?

`string`

###### observationId?

`string`

###### comment?

`string`

###### metadata?

`Record`\<`string`, `unknown`\>

#### Returns

`Promise`\<`unknown`\>

---

### trace?

> `optional` **trace?**: (`params`) => `object`

#### Parameters

##### params

###### name

`string`

###### metadata?

`Record`\<`string`, `unknown`\>

###### tags?

`string`[]

#### Returns

`object`

##### id

> **id**: `string`

---

### shutdown?

> `optional` **shutdown?**: () => `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>
