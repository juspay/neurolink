[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BedrockContentBlock

# Type Alias: BedrockContentBlock

> **BedrockContentBlock** = `object`

Defined in: [types/providers.ts:998](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L998)

Bedrock content block structure

## Properties

### text?

> `optional` **text?**: `string`

Defined in: [types/providers.ts:999](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L999)

---

### image?

> `optional` **image?**: `object`

Defined in: [types/providers.ts:1000](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1000)

#### format

> **format**: `"png"` \| `"jpeg"` \| `"gif"` \| `"webp"`

#### source

> **source**: `object`

##### source.bytes?

> `optional` **bytes?**: `Uint8Array` \| `Buffer`

---

### document?

> `optional` **document?**: `object`

Defined in: [types/providers.ts:1006](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1006)

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

Defined in: [types/providers.ts:1022](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1022)

---

### toolResult?

> `optional` **toolResult?**: [`BedrockToolResult`](BedrockToolResult.md)

Defined in: [types/providers.ts:1023](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1023)
