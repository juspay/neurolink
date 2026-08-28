[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BedrockContentBlock

# Type Alias: BedrockContentBlock

> **BedrockContentBlock** = `object`

Defined in: [types/providers.ts:1001](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1001)

Bedrock content block structure

## Properties

### text?

> `optional` **text?**: `string`

Defined in: [types/providers.ts:1002](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1002)

---

### image?

> `optional` **image?**: `object`

Defined in: [types/providers.ts:1003](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1003)

#### format

> **format**: `"png"` \| `"jpeg"` \| `"gif"` \| `"webp"`

#### source

> **source**: `object`

##### source.bytes?

> `optional` **bytes?**: `Uint8Array` \| `Buffer`

---

### document?

> `optional` **document?**: `object`

Defined in: [types/providers.ts:1009](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1009)

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

Defined in: [types/providers.ts:1025](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1025)

---

### toolResult?

> `optional` **toolResult?**: [`BedrockToolResult`](BedrockToolResult.md)

Defined in: [types/providers.ts:1026](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1026)
