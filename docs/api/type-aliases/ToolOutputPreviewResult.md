[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolOutputPreviewResult

# Type Alias: ToolOutputPreviewResult

> **ToolOutputPreviewResult** = `object`

Defined in: [types/context.ts:832](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L832)

Result of tool output preview generation.

## Properties

### preview

> **preview**: `string`

Defined in: [types/context.ts:834](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L834)

The preview string (or full output if under limits)

---

### truncated

> **truncated**: `boolean`

Defined in: [types/context.ts:836](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L836)

Whether truncation was applied

---

### originalSize

> **originalSize**: `number`

Defined in: [types/context.ts:838](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L838)

Original byte size of the full output
