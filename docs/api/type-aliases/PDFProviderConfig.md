[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PDFProviderConfig

# Type Alias: PDFProviderConfig

> **PDFProviderConfig** = `object`

Defined in: [types/file.ts:505](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L505)

PDF provider configuration

## Properties

### maxSizeMB

> **maxSizeMB**: `number`

Defined in: [types/file.ts:506](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L506)

---

### maxPages

> **maxPages**: `number`

Defined in: [types/file.ts:507](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L507)

---

### supportsNative

> **supportsNative**: `boolean`

Defined in: [types/file.ts:508](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L508)

---

### requiresCitations

> **requiresCitations**: `boolean` \| `"auto"`

Defined in: [types/file.ts:517](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L517)

Whether this provider needs source citations enabled for visual PDF
analysis (#349). `"auto"` = enable when the request requires visual
grounding (currently Bedrock's Converse document blocks); `false` = the
provider handles PDFs without an explicit citations flag. Surfaced on
`FileProcessingResult.metadata.requiresCitations` so downstream provider
adapters can act on it instead of the value being dead config.

---

### apiType

> **apiType**: [`PDFAPIType`](PDFAPIType.md)

Defined in: [types/file.ts:518](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L518)
