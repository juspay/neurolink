[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BedrockContentBlock

# Type Alias: BedrockContentBlock

> **BedrockContentBlock** = `object`

Defined in: [types/providers.ts:1028](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1028)

Bedrock content block structure

## Properties

### text?

> `optional` **text?**: `string`

Defined in: [types/providers.ts:1029](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1029)

---

### image?

> `optional` **image?**: `object`

Defined in: [types/providers.ts:1030](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1030)

#### format

> **format**: `"png"` \| `"jpeg"` \| `"gif"` \| `"webp"`

#### source

> **source**: `object`

##### source.bytes?

> `optional` **bytes?**: `Uint8Array` \| `Buffer`

---

### document?

> `optional` **document?**: `object`

Defined in: [types/providers.ts:1036](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1036)

#### format

> **format**: `"pdf"` \| `"csv"` \| `"doc"` \| `"docx"` \| `"xls"` \| `"xlsx"` \| `"html"` \| `"txt"` \| `"md"`

#### name

> **name**: `string`

#### source

> **source**: `object`

##### source.bytes?

> `optional` **bytes?**: `Uint8Array` \| `Buffer`

---

### toolUse?

> `optional` **toolUse?**: [`BedrockToolUse`](BedrockToolUse.md)

Defined in: [types/providers.ts:1052](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1052)

---

### toolResult?

> `optional` **toolResult?**: [`BedrockToolResult`](BedrockToolResult.md)

Defined in: [types/providers.ts:1053](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1053)
