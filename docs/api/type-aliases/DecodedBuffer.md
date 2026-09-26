[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DecodedBuffer

# Type Alias: DecodedBuffer

> **DecodedBuffer** = `object`

Defined in: [types/file.ts:312](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L312)

Result of decoding a buffer with encoding detection (#362).

## Properties

### text

> **text**: `string`

Defined in: [types/file.ts:314](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L314)

Decoded text with any BOM removed.

---

### encoding

> **encoding**: `string`

Defined in: [types/file.ts:316](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L316)

iconv-lite label actually used to decode.

---

### confidence

> **confidence**: `number`

Defined in: [types/file.ts:318](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L318)

Detection confidence 0-100 (100 for BOM/override, 0 for the UTF-8 fallback).
