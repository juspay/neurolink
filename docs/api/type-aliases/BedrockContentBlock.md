[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BedrockContentBlock

# Type Alias: BedrockContentBlock

> **BedrockContentBlock** = `object`

Defined in: [types/providers.ts:1004](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1004)

Bedrock content block structure

## Properties

### text?

> `optional` **text?**: `string`

Defined in: [types/providers.ts:1005](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1005)

---

### image?

> `optional` **image?**: `object`

Defined in: [types/providers.ts:1006](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1006)

#### format

> **format**: `"png"` \| `"jpeg"` \| `"gif"` \| `"webp"`

#### source

> **source**: `object`

##### source.bytes?

> `optional` **bytes?**: `Uint8Array` \| `Buffer`

---

### document?

> `optional` **document?**: `object`

Defined in: [types/providers.ts:1012](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1012)

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

Defined in: [types/providers.ts:1028](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1028)

---

### toolResult?

> `optional` **toolResult?**: [`BedrockToolResult`](BedrockToolResult.md)

Defined in: [types/providers.ts:1029](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1029)
