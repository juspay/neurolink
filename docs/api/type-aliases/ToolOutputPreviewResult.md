[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolOutputPreviewResult

# Type Alias: ToolOutputPreviewResult

> **ToolOutputPreviewResult** = `object`

Defined in: [types/context.ts:823](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L823)

Result of tool output preview generation.

## Properties

### preview

> **preview**: `string`

Defined in: [types/context.ts:825](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L825)

The preview string (or full output if under limits)

---

### truncated

> **truncated**: `boolean`

Defined in: [types/context.ts:827](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L827)

Whether truncation was applied

---

### originalSize

> **originalSize**: `number`

Defined in: [types/context.ts:829](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L829)

Original byte size of the full output
