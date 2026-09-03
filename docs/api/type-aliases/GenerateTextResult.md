[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / GenerateTextResult

# Type Alias: GenerateTextResult\<TOOLS, OUTPUT\>

> **GenerateTextResult**\<`TOOLS`, `OUTPUT`\> = [`StepResult`](StepResult.md)\<`TOOLS`\> & `object`

Defined in: [types/aiCompat.ts:570](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L570)

## Type Declaration

### steps

> `readonly` **steps**: [`StepResult`](StepResult.md)\<`TOOLS`\>[]

### totalUsage

> `readonly` **totalUsage**: [`LanguageModelUsage`](LanguageModelUsage.md)

### experimental_output?

> `readonly` `optional` **experimental_output?**: `OUTPUT`

## Type Parameters

### TOOLS

`TOOLS` _extends_ [`ToolSet`](ToolSet.md) = [`ToolSet`](ToolSet.md)

### OUTPUT

`OUTPUT` = `unknown`
