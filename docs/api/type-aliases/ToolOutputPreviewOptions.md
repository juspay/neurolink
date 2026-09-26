[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolOutputPreviewOptions

# Type Alias: ToolOutputPreviewOptions

> **ToolOutputPreviewOptions** = `object`

Options for tool output preview generation.

## Properties

### maxBytes?

> `optional` **maxBytes?**: `number`

Maximum bytes for the preview (default: 50KB)

---

### maxLines?

> `optional` **maxLines?**: `number`

Maximum lines for the preview (default: 2000)

---

### headRatio?

> `optional` **headRatio?**: `number`

Fraction of preview budget allocated to the head (default: 0.25)

---

### tailRatio?

> `optional` **tailRatio?**: `number`

Fraction of preview budget allocated to the tail (default: 0.75)

---

### notice?

> `optional` **notice?**: `string` \| ((`omittedBytes`) => `string`)

Override the omission notice spliced between head and tail. A string is
used verbatim; a function receives the omitted byte count and returns
the notice text. When omitted, the built-in default is used, which
names the `retrieve_context` tool — pass this when that tool is not
registered on the calling instance so the model isn't pointed at a tool
that doesn't exist.
