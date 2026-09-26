[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BedrockContentBlock

# Type Alias: BedrockContentBlock

> **BedrockContentBlock** = `object`

Defined in: [types/providers.ts:1089](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1089)

Bedrock content block structure

## Properties

### text?

> `optional` **text?**: `string`

Defined in: [types/providers.ts:1090](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1090)

---

### image?

> `optional` **image?**: `object`

Defined in: [types/providers.ts:1091](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1091)

#### format

> **format**: `"png"` \| `"jpeg"` \| `"gif"` \| `"webp"`

#### source

> **source**: `object`

##### source.bytes?

> `optional` **bytes?**: `Uint8Array` \| `Buffer`

---

### document?

> `optional` **document?**: `object`

Defined in: [types/providers.ts:1097](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1097)

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

Defined in: [types/providers.ts:1113](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1113)

---

### toolResult?

> `optional` **toolResult?**: [`BedrockToolResult`](BedrockToolResult.md)

Defined in: [types/providers.ts:1114](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1114)
