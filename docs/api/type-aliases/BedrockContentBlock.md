[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BedrockContentBlock

# Type Alias: BedrockContentBlock

> **BedrockContentBlock** = `object`

Defined in: [types/providers.ts:1067](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1067)

Bedrock content block structure

## Properties

### text?

> `optional` **text?**: `string`

Defined in: [types/providers.ts:1068](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1068)

---

### image?

> `optional` **image?**: `object`

Defined in: [types/providers.ts:1069](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1069)

#### format

> **format**: `"png"` \| `"jpeg"` \| `"gif"` \| `"webp"`

#### source

> **source**: `object`

##### source.bytes?

> `optional` **bytes?**: `Uint8Array` \| `Buffer`

---

### document?

> `optional` **document?**: `object`

Defined in: [types/providers.ts:1075](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1075)

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

Defined in: [types/providers.ts:1091](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1091)

---

### toolResult?

> `optional` **toolResult?**: [`BedrockToolResult`](BedrockToolResult.md)

Defined in: [types/providers.ts:1092](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1092)
