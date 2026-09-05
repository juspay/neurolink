[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BedrockContentBlock

# Type Alias: BedrockContentBlock

> **BedrockContentBlock** = `object`

Defined in: [types/providers.ts:1030](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1030)

Bedrock content block structure

## Properties

### text?

> `optional` **text?**: `string`

Defined in: [types/providers.ts:1031](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1031)

---

### image?

> `optional` **image?**: `object`

Defined in: [types/providers.ts:1032](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1032)

#### format

> **format**: `"png"` \| `"jpeg"` \| `"gif"` \| `"webp"`

#### source

> **source**: `object`

##### source.bytes?

> `optional` **bytes?**: `Uint8Array` \| `Buffer`

---

### document?

> `optional` **document?**: `object`

Defined in: [types/providers.ts:1038](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1038)

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

Defined in: [types/providers.ts:1054](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1054)

---

### toolResult?

> `optional` **toolResult?**: [`BedrockToolResult`](BedrockToolResult.md)

Defined in: [types/providers.ts:1055](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1055)
