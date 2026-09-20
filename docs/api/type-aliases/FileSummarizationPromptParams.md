[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / FileSummarizationPromptParams

# Type Alias: FileSummarizationPromptParams

> **FileSummarizationPromptParams** = `object`

Defined in: [types/context.ts:735](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L735)

Parameters for `buildFileSummarizationPrompt()`.

## Properties

### fileName

> **fileName**: `string`

Defined in: [types/context.ts:737](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L737)

File display name

---

### fileType

> **fileType**: `string`

Defined in: [types/context.ts:739](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L739)

File type label

---

### fileContent

> **fileContent**: `string`

Defined in: [types/context.ts:741](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L741)

Full extracted text of the file

---

### userPrompt

> **userPrompt**: `string`

Defined in: [types/context.ts:743](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L743)

The user's original prompt / question

---

### targetTokens

> **targetTokens**: `number`

Defined in: [types/context.ts:745](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L745)

Target output token count for the summary
