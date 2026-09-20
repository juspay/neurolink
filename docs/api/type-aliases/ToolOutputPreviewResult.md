[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolOutputPreviewResult

# Type Alias: ToolOutputPreviewResult

> **ToolOutputPreviewResult** = `object`

Defined in: [types/context.ts:834](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L834)

Result of tool output preview generation.

## Properties

### preview

> **preview**: `string`

Defined in: [types/context.ts:836](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L836)

The preview string (or full output if under limits)

---

### truncated

> **truncated**: `boolean`

Defined in: [types/context.ts:838](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L838)

Whether truncation was applied

---

### originalSize

> **originalSize**: `number`

Defined in: [types/context.ts:840](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L840)

Original byte size of the full output
