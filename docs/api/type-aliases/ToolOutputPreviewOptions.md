[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolOutputPreviewOptions

# Type Alias: ToolOutputPreviewOptions

> **ToolOutputPreviewOptions** = `object`

Defined in: [types/context.ts:811](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L811)

Options for tool output preview generation.

## Properties

### maxBytes?

> `optional` **maxBytes?**: `number`

Defined in: [types/context.ts:813](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L813)

Maximum bytes for the preview (default: 50KB)

---

### maxLines?

> `optional` **maxLines?**: `number`

Defined in: [types/context.ts:815](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L815)

Maximum lines for the preview (default: 2000)

---

### headRatio?

> `optional` **headRatio?**: `number`

Defined in: [types/context.ts:817](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L817)

Fraction of preview budget allocated to the head (default: 0.25)

---

### tailRatio?

> `optional` **tailRatio?**: `number`

Defined in: [types/context.ts:819](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L819)

Fraction of preview budget allocated to the tail (default: 0.75)
