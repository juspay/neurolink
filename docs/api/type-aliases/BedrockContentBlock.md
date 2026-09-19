[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BedrockContentBlock

# Type Alias: BedrockContentBlock

> **BedrockContentBlock** = `object`

Defined in: [types/providers.ts:1031](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1031)

Bedrock content block structure

## Properties

### text?

> `optional` **text?**: `string`

Defined in: [types/providers.ts:1032](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1032)

---

### image?

> `optional` **image?**: `object`

Defined in: [types/providers.ts:1033](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1033)

#### format

> **format**: `"png"` \| `"jpeg"` \| `"gif"` \| `"webp"`

#### source

> **source**: `object`

##### source.bytes?

> `optional` **bytes?**: `Uint8Array` \| `Buffer`

---

### document?

> `optional` **document?**: `object`

Defined in: [types/providers.ts:1039](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1039)

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

Defined in: [types/providers.ts:1055](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1055)

---

### toolResult?

> `optional` **toolResult?**: [`BedrockToolResult`](BedrockToolResult.md)

Defined in: [types/providers.ts:1056](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1056)
