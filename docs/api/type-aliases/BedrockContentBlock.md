[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BedrockContentBlock

# Type Alias: BedrockContentBlock

> **BedrockContentBlock** = `object`

Defined in: [types/providers.ts:1009](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1009)

Bedrock content block structure

## Properties

### text?

> `optional` **text?**: `string`

Defined in: [types/providers.ts:1010](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1010)

---

### image?

> `optional` **image?**: `object`

Defined in: [types/providers.ts:1011](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1011)

#### format

> **format**: `"png"` \| `"jpeg"` \| `"gif"` \| `"webp"`

#### source

> **source**: `object`

##### source.bytes?

> `optional` **bytes?**: `Uint8Array` \| `Buffer`

---

### document?

> `optional` **document?**: `object`

Defined in: [types/providers.ts:1017](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1017)

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

Defined in: [types/providers.ts:1033](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1033)

---

### toolResult?

> `optional` **toolResult?**: [`BedrockToolResult`](BedrockToolResult.md)

Defined in: [types/providers.ts:1034](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1034)
