[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DecodedBuffer

# Type Alias: DecodedBuffer

> **DecodedBuffer** = `object`

Defined in: [types/file.ts:303](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L303)

Result of decoding a buffer with encoding detection (#362).

## Properties

### text

> **text**: `string`

Defined in: [types/file.ts:305](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L305)

Decoded text with any BOM removed.

---

### encoding

> **encoding**: `string`

Defined in: [types/file.ts:307](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L307)

iconv-lite label actually used to decode.

---

### confidence

> **confidence**: `number`

Defined in: [types/file.ts:309](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L309)

Detection confidence 0-100 (100 for BOM/override, 0 for the UTF-8 fallback).
