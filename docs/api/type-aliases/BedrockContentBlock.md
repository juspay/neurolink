[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BedrockContentBlock

# Type Alias: BedrockContentBlock

> **BedrockContentBlock** = `object`

Defined in: [types/providers.ts:1019](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1019)

Bedrock content block structure

## Properties

### text?

> `optional` **text?**: `string`

Defined in: [types/providers.ts:1020](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1020)

---

### image?

> `optional` **image?**: `object`

Defined in: [types/providers.ts:1021](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1021)

#### format

> **format**: `"png"` \| `"jpeg"` \| `"gif"` \| `"webp"`

#### source

> **source**: `object`

##### source.bytes?

> `optional` **bytes?**: `Uint8Array` \| `Buffer`

---

### document?

> `optional` **document?**: `object`

Defined in: [types/providers.ts:1027](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1027)

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

Defined in: [types/providers.ts:1043](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1043)

---

### toolResult?

> `optional` **toolResult?**: [`BedrockToolResult`](BedrockToolResult.md)

Defined in: [types/providers.ts:1044](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1044)
