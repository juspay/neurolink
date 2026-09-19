[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DecodedBuffer

# Type Alias: DecodedBuffer

> **DecodedBuffer** = `object`

Defined in: [types/file.ts:330](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L330)

Result of decoding a buffer with encoding detection (#362).

## Properties

### text

> **text**: `string`

Defined in: [types/file.ts:332](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L332)

Decoded text with any BOM removed.

---

### encoding

> **encoding**: `string`

Defined in: [types/file.ts:334](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L334)

iconv-lite label actually used to decode.

---

### confidence

> **confidence**: `number`

Defined in: [types/file.ts:336](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L336)

Detection confidence 0-100 (100 for BOM/override, 0 for the UTF-8 fallback).
