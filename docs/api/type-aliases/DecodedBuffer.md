[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DecodedBuffer

# Type Alias: DecodedBuffer

> **DecodedBuffer** = `object`

Defined in: [types/file.ts:419](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L419)

Result of decoding a buffer with encoding detection (#362).

## Properties

### text

> **text**: `string`

Defined in: [types/file.ts:421](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L421)

Decoded text with any BOM removed.

---

### encoding

> **encoding**: `string`

Defined in: [types/file.ts:423](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L423)

iconv-lite label actually used to decode.

---

### confidence

> **confidence**: `number`

Defined in: [types/file.ts:425](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L425)

Detection confidence 0-100 (100 for BOM/override, 0 for the UTF-8 fallback).
