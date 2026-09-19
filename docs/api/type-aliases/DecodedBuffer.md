[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DecodedBuffer

# Type Alias: DecodedBuffer

> **DecodedBuffer** = `object`

Defined in: [types/file.ts:390](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L390)

Result of decoding a buffer with encoding detection (#362).

## Properties

### text

> **text**: `string`

Defined in: [types/file.ts:392](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L392)

Decoded text with any BOM removed.

---

### encoding

> **encoding**: `string`

Defined in: [types/file.ts:394](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L394)

iconv-lite label actually used to decode.

---

### confidence

> **confidence**: `number`

Defined in: [types/file.ts:396](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L396)

Detection confidence 0-100 (100 for BOM/override, 0 for the UTF-8 fallback).
