[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SummarizationPromptOptions

# Type Alias: SummarizationPromptOptions

> **SummarizationPromptOptions** = `object`

Options for summarization prompt building.

## Properties

### isIncremental

> **isIncremental**: `boolean`

Whether this is an incremental update to an existing summary

---

### previousSummary?

> `optional` **previousSummary?**: `string`

The previous summary to merge with (required for incremental mode)

---

### filesRead?

> `optional` **filesRead?**: `string`[]

List of files that have been read during the conversation

---

### filesModified?

> `optional` **filesModified?**: `string`[]

List of files that have been modified during the conversation
