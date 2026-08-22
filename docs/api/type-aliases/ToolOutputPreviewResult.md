[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolOutputPreviewResult

# Type Alias: ToolOutputPreviewResult

> **ToolOutputPreviewResult** = `object`

Defined in: [types/context.ts:846](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L846)

Result of tool output preview generation.

## Properties

### preview

> **preview**: `string`

Defined in: [types/context.ts:848](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L848)

The preview string (or full output if under limits)

---

### truncated

> **truncated**: `boolean`

Defined in: [types/context.ts:850](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L850)

Whether truncation was applied

---

### originalSize

> **originalSize**: `number`

Defined in: [types/context.ts:852](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L852)

Original byte size of the full output
