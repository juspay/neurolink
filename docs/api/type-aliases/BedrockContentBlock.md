[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BedrockContentBlock

# Type Alias: BedrockContentBlock

> **BedrockContentBlock** = `object`

Defined in: [types/providers.ts:1026](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1026)

Bedrock content block structure

## Properties

### text?

> `optional` **text?**: `string`

Defined in: [types/providers.ts:1027](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1027)

---

### image?

> `optional` **image?**: `object`

Defined in: [types/providers.ts:1028](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1028)

#### format

> **format**: `"png"` \| `"jpeg"` \| `"gif"` \| `"webp"`

#### source

> **source**: `object`

##### source.bytes?

> `optional` **bytes?**: `Uint8Array` \| `Buffer`

---

### document?

> `optional` **document?**: `object`

Defined in: [types/providers.ts:1034](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1034)

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

Defined in: [types/providers.ts:1050](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1050)

---

### toolResult?

> `optional` **toolResult?**: [`BedrockToolResult`](BedrockToolResult.md)

Defined in: [types/providers.ts:1051](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1051)
