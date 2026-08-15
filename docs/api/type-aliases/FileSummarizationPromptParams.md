[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / FileSummarizationPromptParams

# Type Alias: FileSummarizationPromptParams

> **FileSummarizationPromptParams** = `object`

Defined in: [types/context.ts:756](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/context.ts#L756)

Parameters for `buildFileSummarizationPrompt()`.

## Properties

### fileName

> **fileName**: `string`

Defined in: [types/context.ts:758](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/context.ts#L758)

File display name

---

### fileType

> **fileType**: `string`

Defined in: [types/context.ts:760](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/context.ts#L760)

File type label

---

### fileContent

> **fileContent**: `string`

Defined in: [types/context.ts:762](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/context.ts#L762)

Full extracted text of the file

---

### userPrompt

> **userPrompt**: `string`

Defined in: [types/context.ts:764](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/context.ts#L764)

The user's original prompt / question

---

### targetTokens

> **targetTokens**: `number`

Defined in: [types/context.ts:766](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/context.ts#L766)

Target output token count for the summary
