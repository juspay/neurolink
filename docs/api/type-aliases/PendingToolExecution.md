[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / PendingToolExecution

# Type Alias: PendingToolExecution

> **PendingToolExecution** = `object`

Defined in: [types/tools.ts:521](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/tools.ts#L521)

Pending tool execution type for Redis memory manager
Temporary storage for tool execution data to avoid race conditions

## Properties

### toolCalls

> **toolCalls**: `object`[]

Defined in: [types/tools.ts:522](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/tools.ts#L522)

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

Defined in: [types/tools.ts:531](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/tools.ts#L531)

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

Defined in: [types/tools.ts:541](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/tools.ts#L541)
