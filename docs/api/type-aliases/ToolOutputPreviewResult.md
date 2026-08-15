[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolOutputPreviewResult

# Type Alias: ToolOutputPreviewResult

> **ToolOutputPreviewResult** = `object`

Defined in: [types/context.ts:846](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/context.ts#L846)

Result of tool output preview generation.

## Properties

### preview

> **preview**: `string`

Defined in: [types/context.ts:848](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/context.ts#L848)

The preview string (or full output if under limits)

---

### truncated

> **truncated**: `boolean`

Defined in: [types/context.ts:850](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/context.ts#L850)

Whether truncation was applied

---

### originalSize

> **originalSize**: `number`

Defined in: [types/context.ts:852](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/context.ts#L852)

Original byte size of the full output
