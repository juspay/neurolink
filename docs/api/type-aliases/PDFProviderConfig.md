[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PDFProviderConfig

# Type Alias: PDFProviderConfig

> **PDFProviderConfig** = `object`

Defined in: [types/file.ts:533](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L533)

PDF provider configuration

## Properties

### maxSizeMB

> **maxSizeMB**: `number`

Defined in: [types/file.ts:534](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L534)

---

### maxPages

> **maxPages**: `number`

Defined in: [types/file.ts:535](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L535)

---

### supportsNative

> **supportsNative**: `boolean`

Defined in: [types/file.ts:536](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L536)

---

### requiresCitations

> **requiresCitations**: `boolean` \| `"auto"`

Defined in: [types/file.ts:545](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L545)

Whether this provider needs source citations enabled for visual PDF
analysis (#349). `"auto"` = enable when the request requires visual
grounding (currently Bedrock's Converse document blocks); `false` = the
provider handles PDFs without an explicit citations flag. Surfaced on
`FileProcessingResult.metadata.requiresCitations` so downstream provider
adapters can act on it instead of the value being dead config.

---

### apiType

> **apiType**: [`PDFAPIType`](PDFAPIType.md)

Defined in: [types/file.ts:546](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L546)
