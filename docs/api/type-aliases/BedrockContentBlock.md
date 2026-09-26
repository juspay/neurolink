[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BedrockContentBlock

# Type Alias: BedrockContentBlock

> **BedrockContentBlock** = `object`

Defined in: [types/providers.ts:1091](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1091)

Bedrock content block structure

## Properties

### text?

> `optional` **text?**: `string`

Defined in: [types/providers.ts:1092](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1092)

---

### image?

> `optional` **image?**: `object`

Defined in: [types/providers.ts:1093](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1093)

#### format

> **format**: `"png"` \| `"jpeg"` \| `"gif"` \| `"webp"`

#### source

> **source**: `object`

##### source.bytes?

> `optional` **bytes?**: `Uint8Array` \| `Buffer`

---

### document?

> `optional` **document?**: `object`

Defined in: [types/providers.ts:1099](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1099)

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

Defined in: [types/providers.ts:1115](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1115)

---

### toolResult?

> `optional` **toolResult?**: [`BedrockToolResult`](BedrockToolResult.md)

Defined in: [types/providers.ts:1116](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1116)
