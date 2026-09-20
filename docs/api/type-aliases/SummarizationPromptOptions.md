[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SummarizationPromptOptions

# Type Alias: SummarizationPromptOptions

> **SummarizationPromptOptions** = `object`

Defined in: [types/context.ts:953](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L953)

Options for summarization prompt building.

## Properties

### isIncremental

> **isIncremental**: `boolean`

Defined in: [types/context.ts:957](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L957)

Whether this is an incremental update to an existing summary

---

### previousSummary?

> `optional` **previousSummary?**: `string`

Defined in: [types/context.ts:962](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L962)

The previous summary to merge with (required for incremental mode)

---

### filesRead?

> `optional` **filesRead?**: `string`[]

Defined in: [types/context.ts:967](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L967)

List of files that have been read during the conversation

---

### filesModified?

> `optional` **filesModified?**: `string`[]

Defined in: [types/context.ts:972](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L972)

List of files that have been modified during the conversation
