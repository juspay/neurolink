[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PDFProviderConfig

# Type Alias: PDFProviderConfig

> **PDFProviderConfig** = `object`

PDF provider configuration

## Properties

### maxSizeMB

> **maxSizeMB**: `number`

---

### maxPages

> **maxPages**: `number`

---

### supportsNative

> **supportsNative**: `boolean`

---

### requiresCitations

> **requiresCitations**: `boolean` \| `"auto"`

Whether this provider needs source citations enabled for visual PDF
analysis (#349). `"auto"` = enable when the request requires visual
grounding (currently Bedrock's Converse document blocks); `false` = the
provider handles PDFs without an explicit citations flag. Surfaced on
`FileProcessingResult.metadata.requiresCitations` so downstream provider
adapters can act on it instead of the value being dead config.

---

### apiType

> **apiType**: [`PDFAPIType`](PDFAPIType.md)
