[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BedrockContentBlock

# Type Alias: BedrockContentBlock

> **BedrockContentBlock** = `object`

Defined in: [types/providers.ts:1063](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1063)

Bedrock content block structure

## Properties

### text?

> `optional` **text?**: `string`

Defined in: [types/providers.ts:1064](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1064)

---

### image?

> `optional` **image?**: `object`

Defined in: [types/providers.ts:1065](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1065)

#### format

> **format**: `"png"` \| `"jpeg"` \| `"gif"` \| `"webp"`

#### source

> **source**: `object`

##### source.bytes?

> `optional` **bytes?**: `Uint8Array` \| `Buffer`

---

### document?

> `optional` **document?**: `object`

Defined in: [types/providers.ts:1071](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1071)

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

Defined in: [types/providers.ts:1087](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1087)

---

### toolResult?

> `optional` **toolResult?**: [`BedrockToolResult`](BedrockToolResult.md)

Defined in: [types/providers.ts:1088](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1088)
