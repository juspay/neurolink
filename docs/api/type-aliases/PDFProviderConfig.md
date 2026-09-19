[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PDFProviderConfig

# Type Alias: PDFProviderConfig

> **PDFProviderConfig** = `object`

Defined in: [types/file.ts:383](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L383)

PDF provider configuration

## Properties

### maxSizeMB

> **maxSizeMB**: `number`

Defined in: [types/file.ts:384](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L384)

---

### maxPages

> **maxPages**: `number`

Defined in: [types/file.ts:385](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L385)

---

### supportsNative

> **supportsNative**: `boolean`

Defined in: [types/file.ts:386](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L386)

---

### requiresCitations

> **requiresCitations**: `boolean` \| `"auto"`

Defined in: [types/file.ts:395](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L395)

Whether this provider needs source citations enabled for visual PDF
analysis (#349). `"auto"` = enable when the request requires visual
grounding (currently Bedrock's Converse document blocks); `false` = the
provider handles PDFs without an explicit citations flag. Surfaced on
`FileProcessingResult.metadata.requiresCitations` so downstream provider
adapters can act on it instead of the value being dead config.

---

### apiType

> **apiType**: [`PDFAPIType`](PDFAPIType.md)

Defined in: [types/file.ts:396](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L396)
