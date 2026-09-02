[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolOutputPreviewOptions

# Type Alias: ToolOutputPreviewOptions

> **ToolOutputPreviewOptions** = `object`

Defined in: [types/context.ts:834](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L834)

Options for tool output preview generation.

## Properties

### maxBytes?

> `optional` **maxBytes?**: `number`

Defined in: [types/context.ts:836](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L836)

Maximum bytes for the preview (default: 50KB)

---

### maxLines?

> `optional` **maxLines?**: `number`

Defined in: [types/context.ts:838](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L838)

Maximum lines for the preview (default: 2000)

---

### headRatio?

> `optional` **headRatio?**: `number`

Defined in: [types/context.ts:840](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L840)

Fraction of preview budget allocated to the head (default: 0.25)

---

### tailRatio?

> `optional` **tailRatio?**: `number`

Defined in: [types/context.ts:842](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L842)

Fraction of preview budget allocated to the tail (default: 0.75)

---

### notice?

> `optional` **notice?**: `string` \| ((`omittedBytes`) => `string`)

Defined in: [types/context.ts:851](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L851)

Override the omission notice spliced between head and tail. A string is
used verbatim; a function receives the omitted byte count and returns
the notice text. When omitted, the built-in default is used, which
names the `retrieve_context` tool — pass this when that tool is not
registered on the calling instance so the model isn't pointed at a tool
that doesn't exist.
