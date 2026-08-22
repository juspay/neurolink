[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClaudeImageBlock

# Type Alias: ClaudeImageBlock

> **ClaudeImageBlock** = `object`

Defined in: [types/proxy.ts:62](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L62)

A single image block in a Claude content array.

## Properties

### type

> **type**: `"image"`

Defined in: [types/proxy.ts:63](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L63)

---

### source

> **source**: `object`

Defined in: [types/proxy.ts:64](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L64)

#### type

> **type**: `"base64"` \| `"url"`

#### media_type?

> `optional` **media_type?**: `string`

#### data?

> `optional` **data?**: `string`

#### url?

> `optional` **url?**: `string`
