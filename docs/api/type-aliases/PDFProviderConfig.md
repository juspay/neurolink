[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PDFProviderConfig

# Type Alias: PDFProviderConfig

> **PDFProviderConfig** = `object`

Defined in: [types/file.ts:443](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L443)

PDF provider configuration

## Properties

### maxSizeMB

> **maxSizeMB**: `number`

Defined in: [types/file.ts:444](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L444)

---

### maxPages

> **maxPages**: `number`

Defined in: [types/file.ts:445](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L445)

---

### supportsNative

> **supportsNative**: `boolean`

Defined in: [types/file.ts:446](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L446)

---

### requiresCitations

> **requiresCitations**: `boolean` \| `"auto"`

Defined in: [types/file.ts:455](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L455)

Whether this provider needs source citations enabled for visual PDF
analysis (#349). `"auto"` = enable when the request requires visual
grounding (currently Bedrock's Converse document blocks); `false` = the
provider handles PDFs without an explicit citations flag. Surfaced on
`FileProcessingResult.metadata.requiresCitations` so downstream provider
adapters can act on it instead of the value being dead config.

---

### apiType

> **apiType**: [`PDFAPIType`](PDFAPIType.md)

Defined in: [types/file.ts:456](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L456)
