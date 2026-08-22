[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VisionImageConversion

# Type Alias: VisionImageConversion

> **VisionImageConversion** = `object`

Defined in: [types/file.ts:34](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L34)

Outcome of a vision-compatibility pass over one image.

See `adapters/imageFormatSupport.ts` — `converted` is false both when the
source format was already universally accepted and when no decoder could
read it, so callers must not treat it as a success flag.

## Properties

### buffer

> `readonly` **buffer**: `Buffer`

Defined in: [types/file.ts:35](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L35)

---

### mimeType

> `readonly` **mimeType**: `string`

Defined in: [types/file.ts:36](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L36)

---

### converted

> `readonly` **converted**: `boolean`

Defined in: [types/file.ts:38](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L38)

True when the bytes were re-encoded; false when they were left alone.
