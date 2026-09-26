[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DecodedBuffer

# Type Alias: DecodedBuffer

> **DecodedBuffer** = `object`

Result of decoding a buffer with encoding detection (#362).

## Properties

### text

> **text**: `string`

Decoded text with any BOM removed.

---

### encoding

> **encoding**: `string`

iconv-lite label actually used to decode.

---

### confidence

> **confidence**: `number`

Detection confidence 0-100 (100 for BOM/override, 0 for the UTF-8 fallback).
