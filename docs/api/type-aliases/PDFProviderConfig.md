[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PDFProviderConfig

# Type Alias: PDFProviderConfig

> **PDFProviderConfig** = `object`

Defined in: [types/file.ts:365](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L365)

PDF provider configuration

## Properties

### maxSizeMB

> **maxSizeMB**: `number`

Defined in: [types/file.ts:366](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L366)

---

### maxPages

> **maxPages**: `number`

Defined in: [types/file.ts:367](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L367)

---

### supportsNative

> **supportsNative**: `boolean`

Defined in: [types/file.ts:368](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L368)

---

### requiresCitations

> **requiresCitations**: `boolean` \| `"auto"`

Defined in: [types/file.ts:377](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L377)

Whether this provider needs source citations enabled for visual PDF
analysis (#349). `"auto"` = enable when the request requires visual
grounding (currently Bedrock's Converse document blocks); `false` = the
provider handles PDFs without an explicit citations flag. Surfaced on
`FileProcessingResult.metadata.requiresCitations` so downstream provider
adapters can act on it instead of the value being dead config.

---

### apiType

> **apiType**: [`PDFAPIType`](PDFAPIType.md)

Defined in: [types/file.ts:378](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L378)
