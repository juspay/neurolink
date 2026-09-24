[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BedrockContentBlock

# Type Alias: BedrockContentBlock

> **BedrockContentBlock** = `object`

Defined in: [types/providers.ts:1082](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1082)

Bedrock content block structure

## Properties

### text?

> `optional` **text?**: `string`

Defined in: [types/providers.ts:1083](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1083)

---

### image?

> `optional` **image?**: `object`

Defined in: [types/providers.ts:1084](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1084)

#### format

> **format**: `"png"` \| `"jpeg"` \| `"gif"` \| `"webp"`

#### source

> **source**: `object`

##### source.bytes?

> `optional` **bytes?**: `Uint8Array` \| `Buffer`

---

### document?

> `optional` **document?**: `object`

Defined in: [types/providers.ts:1090](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1090)

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

Defined in: [types/providers.ts:1106](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1106)

---

### toolResult?

> `optional` **toolResult?**: [`BedrockToolResult`](BedrockToolResult.md)

Defined in: [types/providers.ts:1107](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1107)
