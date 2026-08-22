[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DecodedBuffer

# Type Alias: DecodedBuffer

> **DecodedBuffer** = `object`

Defined in: [types/file.ts:292](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L292)

Result of decoding a buffer with encoding detection (#362).

## Properties

### text

> **text**: `string`

Defined in: [types/file.ts:294](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L294)

Decoded text with any BOM removed.

---

### encoding

> **encoding**: `string`

Defined in: [types/file.ts:296](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L296)

iconv-lite label actually used to decode.

---

### confidence

> **confidence**: `number`

Defined in: [types/file.ts:298](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L298)

Detection confidence 0-100 (100 for BOM/override, 0 for the UTF-8 fallback).
