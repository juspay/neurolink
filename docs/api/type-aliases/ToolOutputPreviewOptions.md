[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolOutputPreviewOptions

# Type Alias: ToolOutputPreviewOptions

> **ToolOutputPreviewOptions** = `object`

Defined in: [types/context.ts:834](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/context.ts#L834)

Options for tool output preview generation.

## Properties

### maxBytes?

> `optional` **maxBytes?**: `number`

Defined in: [types/context.ts:836](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/context.ts#L836)

Maximum bytes for the preview (default: 50KB)

---

### maxLines?

> `optional` **maxLines?**: `number`

Defined in: [types/context.ts:838](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/context.ts#L838)

Maximum lines for the preview (default: 2000)

---

### headRatio?

> `optional` **headRatio?**: `number`

Defined in: [types/context.ts:840](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/context.ts#L840)

Fraction of preview budget allocated to the head (default: 0.25)

---

### tailRatio?

> `optional` **tailRatio?**: `number`

Defined in: [types/context.ts:842](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/context.ts#L842)

Fraction of preview budget allocated to the tail (default: 0.75)
