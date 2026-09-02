[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolOutputPreviewOptions

# Type Alias: ToolOutputPreviewOptions

> **ToolOutputPreviewOptions** = `object`

Defined in: [types/context.ts:811](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L811)

Options for tool output preview generation.

## Properties

### maxBytes?

> `optional` **maxBytes?**: `number`

Defined in: [types/context.ts:813](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L813)

Maximum bytes for the preview (default: 50KB)

---

### maxLines?

> `optional` **maxLines?**: `number`

Defined in: [types/context.ts:815](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L815)

Maximum lines for the preview (default: 2000)

---

### headRatio?

> `optional` **headRatio?**: `number`

Defined in: [types/context.ts:817](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L817)

Fraction of preview budget allocated to the head (default: 0.25)

---

### tailRatio?

> `optional` **tailRatio?**: `number`

Defined in: [types/context.ts:819](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L819)

Fraction of preview budget allocated to the tail (default: 0.75)

---

### notice?

> `optional` **notice?**: `string` \| ((`omittedBytes`) => `string`)

Defined in: [types/context.ts:828](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L828)

Override the omission notice spliced between head and tail. A string is
used verbatim; a function receives the omitted byte count and returns
the notice text. When omitted, the built-in default is used, which
names the `retrieve_context` tool — pass this when that tool is not
registered on the calling instance so the model isn't pointed at a tool
that doesn't exist.
