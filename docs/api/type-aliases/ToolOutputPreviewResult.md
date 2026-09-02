[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolOutputPreviewResult

# Type Alias: ToolOutputPreviewResult

> **ToolOutputPreviewResult** = `object`

Defined in: [types/context.ts:855](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L855)

Result of tool output preview generation.

## Properties

### preview

> **preview**: `string`

Defined in: [types/context.ts:857](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L857)

The preview string (or full output if under limits)

---

### truncated

> **truncated**: `boolean`

Defined in: [types/context.ts:859](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L859)

Whether truncation was applied

---

### originalSize

> **originalSize**: `number`

Defined in: [types/context.ts:861](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L861)

Original byte size of the full output
