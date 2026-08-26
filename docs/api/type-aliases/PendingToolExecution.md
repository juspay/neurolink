[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PendingToolExecution

# Type Alias: PendingToolExecution

> **PendingToolExecution** = `object`

Defined in: [types/tools.ts:532](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L532)

Pending tool execution type for Redis memory manager
Temporary storage for tool execution data to avoid race conditions

## Properties

### toolCalls

> **toolCalls**: `object`[]

Defined in: [types/tools.ts:533](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L533)

#### Index Signature

\[`key`: `string`\]: `unknown`

#### toolCallId?

> `optional` **toolCallId?**: `string`

#### toolName?

> `optional` **toolName?**: `string`

#### args?

> `optional` **args?**: `Record`\<`string`, `unknown`\>

#### timestamp?

> `optional` **timestamp?**: `Date`

#### thoughtSignature?

> `optional` **thoughtSignature?**: `string`

#### stepIndex?

> `optional` **stepIndex?**: `number`

---

### toolResults

> **toolResults**: `object`[]

Defined in: [types/tools.ts:542](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L542)

#### Index Signature

\[`key`: `string`\]: `unknown`

#### toolCallId?

> `optional` **toolCallId?**: `string`

#### toolName?

> `optional` **toolName?**: `string`

#### output?

> `optional` **output?**: `unknown`

#### result?

> `optional` **result?**: `unknown`

#### error?

> `optional` **error?**: `string`

#### timestamp?

> `optional` **timestamp?**: `Date`

#### stepIndex?

> `optional` **stepIndex?**: `number`

---

### timestamp

> **timestamp**: `number`

Defined in: [types/tools.ts:552](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L552)
