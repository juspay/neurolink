[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BedrockContentBlock

# Type Alias: BedrockContentBlock

> **BedrockContentBlock** = `object`

Defined in: [types/providers.ts:997](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L997)

Bedrock content block structure

## Properties

### text?

> `optional` **text?**: `string`

Defined in: [types/providers.ts:998](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L998)

---

### image?

> `optional` **image?**: `object`

Defined in: [types/providers.ts:999](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L999)

#### format

> **format**: `"png"` \| `"jpeg"` \| `"gif"` \| `"webp"`

#### source

> **source**: `object`

##### source.bytes?

> `optional` **bytes?**: `Uint8Array` \| `Buffer`

---

### document?

> `optional` **document?**: `object`

Defined in: [types/providers.ts:1005](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1005)

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

Defined in: [types/providers.ts:1021](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1021)

---

### toolResult?

> `optional` **toolResult?**: [`BedrockToolResult`](BedrockToolResult.md)

Defined in: [types/providers.ts:1022](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1022)
