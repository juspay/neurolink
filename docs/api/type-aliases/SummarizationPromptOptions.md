[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SummarizationPromptOptions

# Type Alias: SummarizationPromptOptions

> **SummarizationPromptOptions** = `object`

Defined in: [types/context.ts:974](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L974)

Options for summarization prompt building.

## Properties

### isIncremental

> **isIncremental**: `boolean`

Defined in: [types/context.ts:978](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L978)

Whether this is an incremental update to an existing summary

---

### previousSummary?

> `optional` **previousSummary?**: `string`

Defined in: [types/context.ts:983](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L983)

The previous summary to merge with (required for incremental mode)

---

### filesRead?

> `optional` **filesRead?**: `string`[]

Defined in: [types/context.ts:988](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L988)

List of files that have been read during the conversation

---

### filesModified?

> `optional` **filesModified?**: `string`[]

Defined in: [types/context.ts:993](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L993)

List of files that have been modified during the conversation
