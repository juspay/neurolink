[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SummarizationPromptOptions

# Type Alias: SummarizationPromptOptions

> **SummarizationPromptOptions** = `object`

Defined in: [types/context.ts:951](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L951)

Options for summarization prompt building.

## Properties

### isIncremental

> **isIncremental**: `boolean`

Defined in: [types/context.ts:955](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L955)

Whether this is an incremental update to an existing summary

---

### previousSummary?

> `optional` **previousSummary?**: `string`

Defined in: [types/context.ts:960](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L960)

The previous summary to merge with (required for incremental mode)

---

### filesRead?

> `optional` **filesRead?**: `string`[]

Defined in: [types/context.ts:965](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L965)

List of files that have been read during the conversation

---

### filesModified?

> `optional` **filesModified?**: `string`[]

Defined in: [types/context.ts:970](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L970)

List of files that have been modified during the conversation
