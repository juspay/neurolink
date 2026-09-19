[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PDFProviderConfig

# Type Alias: PDFProviderConfig

> **PDFProviderConfig** = `object`

Defined in: [types/file.ts:373](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L373)

PDF provider configuration

## Properties

### maxSizeMB

> **maxSizeMB**: `number`

Defined in: [types/file.ts:374](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L374)

---

### maxPages

> **maxPages**: `number`

Defined in: [types/file.ts:375](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L375)

---

### supportsNative

> **supportsNative**: `boolean`

Defined in: [types/file.ts:376](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L376)

---

### requiresCitations

> **requiresCitations**: `boolean` \| `"auto"`

Defined in: [types/file.ts:385](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L385)

Whether this provider needs source citations enabled for visual PDF
analysis (#349). `"auto"` = enable when the request requires visual
grounding (currently Bedrock's Converse document blocks); `false` = the
provider handles PDFs without an explicit citations flag. Surfaced on
`FileProcessingResult.metadata.requiresCitations` so downstream provider
adapters can act on it instead of the value being dead config.

---

### apiType

> **apiType**: [`PDFAPIType`](PDFAPIType.md)

Defined in: [types/file.ts:386](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L386)
