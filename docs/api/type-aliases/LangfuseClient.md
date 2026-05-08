[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / LangfuseClient

# Type Alias: LangfuseClient

> **LangfuseClient** = `object`

Defined in: [types/evaluation.ts:632](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L632)

Minimal Langfuse client interface for evaluation hooks.

## Properties

### score

> **score**: (`params`) => `Promise`\<`unknown`\>

Defined in: [types/evaluation.ts:633](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L633)

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

Defined in: [types/evaluation.ts:641](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L641)

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

Defined in: [types/evaluation.ts:646](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L646)

#### Returns

`Promise`\<`void`\>
