[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / LangfuseClient

# Type Alias: LangfuseClient

> **LangfuseClient** = `object`

Defined in: [types/evaluation.ts:627](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/evaluation.ts#L627)

Minimal Langfuse client interface for evaluation hooks.

## Properties

### score

> **score**: (`params`) => `Promise`\<`unknown`\>

Defined in: [types/evaluation.ts:628](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/evaluation.ts#L628)

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

Defined in: [types/evaluation.ts:636](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/evaluation.ts#L636)

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

Defined in: [types/evaluation.ts:641](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/evaluation.ts#L641)

#### Returns

`Promise`\<`void`\>
