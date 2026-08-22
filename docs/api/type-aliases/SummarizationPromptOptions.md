[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / SummarizationPromptOptions

# Type Alias: SummarizationPromptOptions

> **SummarizationPromptOptions** = `object`

Defined in: [types/context.ts:965](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/context.ts#L965)

Options for summarization prompt building.

## Properties

### isIncremental

> **isIncremental**: `boolean`

Defined in: [types/context.ts:969](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/context.ts#L969)

Whether this is an incremental update to an existing summary

---

### previousSummary?

> `optional` **previousSummary?**: `string`

Defined in: [types/context.ts:974](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/context.ts#L974)

The previous summary to merge with (required for incremental mode)

---

### filesRead?

> `optional` **filesRead?**: `string`[]

Defined in: [types/context.ts:979](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/context.ts#L979)

List of files that have been read during the conversation

---

### filesModified?

> `optional` **filesModified?**: `string`[]

Defined in: [types/context.ts:984](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/context.ts#L984)

List of files that have been modified during the conversation
