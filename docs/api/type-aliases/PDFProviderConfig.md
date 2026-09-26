[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PDFProviderConfig

# Type Alias: PDFProviderConfig

> **PDFProviderConfig** = `object`

Defined in: [types/file.ts:463](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L463)

PDF provider configuration

## Properties

### maxSizeMB

> **maxSizeMB**: `number`

Defined in: [types/file.ts:464](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L464)

---

### maxPages

> **maxPages**: `number`

Defined in: [types/file.ts:465](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L465)

---

### supportsNative

> **supportsNative**: `boolean`

Defined in: [types/file.ts:466](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L466)

---

### requiresCitations

> **requiresCitations**: `boolean` \| `"auto"`

Defined in: [types/file.ts:475](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L475)

Whether this provider needs source citations enabled for visual PDF
analysis (#349). `"auto"` = enable when the request requires visual
grounding (currently Bedrock's Converse document blocks); `false` = the
provider handles PDFs without an explicit citations flag. Surfaced on
`FileProcessingResult.metadata.requiresCitations` so downstream provider
adapters can act on it instead of the value being dead config.

---

### apiType

> **apiType**: [`PDFAPIType`](PDFAPIType.md)

Defined in: [types/file.ts:476](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L476)
