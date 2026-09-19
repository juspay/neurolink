[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DecodedBuffer

# Type Alias: DecodedBuffer

> **DecodedBuffer** = `object`

Defined in: [types/file.ts:320](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L320)

Result of decoding a buffer with encoding detection (#362).

## Properties

### text

> **text**: `string`

Defined in: [types/file.ts:322](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L322)

Decoded text with any BOM removed.

---

### encoding

> **encoding**: `string`

Defined in: [types/file.ts:324](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L324)

iconv-lite label actually used to decode.

---

### confidence

> **confidence**: `number`

Defined in: [types/file.ts:326](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L326)

Detection confidence 0-100 (100 for BOM/override, 0 for the UTF-8 fallback).
