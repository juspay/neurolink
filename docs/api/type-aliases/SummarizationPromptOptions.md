[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / SummarizationPromptOptions

# Type Alias: SummarizationPromptOptions

> **SummarizationPromptOptions** = `object`

Defined in: [types/context.ts:841](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L841)

Options for summarization prompt building.

## Properties

### isIncremental

> **isIncremental**: `boolean`

Defined in: [types/context.ts:845](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L845)

Whether this is an incremental update to an existing summary

---

### previousSummary?

> `optional` **previousSummary?**: `string`

Defined in: [types/context.ts:850](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L850)

The previous summary to merge with (required for incremental mode)

---

### filesRead?

> `optional` **filesRead?**: `string`[]

Defined in: [types/context.ts:855](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L855)

List of files that have been read during the conversation

---

### filesModified?

> `optional` **filesModified?**: `string`[]

Defined in: [types/context.ts:860](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L860)

List of files that have been modified during the conversation
