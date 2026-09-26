[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VisionImageConversion

# Type Alias: VisionImageConversion

> **VisionImageConversion** = `object`

Defined in: [types/file.ts:47](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L47)

Outcome of a vision-compatibility pass over one image.

See `adapters/imageFormatSupport.ts` — `converted` is false both when the
source format was already universally accepted and when no decoder could
read it, so callers must not treat it as a success flag.

## Properties

### buffer

> `readonly` **buffer**: `Buffer`

Defined in: [types/file.ts:48](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L48)

---

### mimeType

> `readonly` **mimeType**: `string`

Defined in: [types/file.ts:49](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L49)

---

### converted

> `readonly` **converted**: `boolean`

Defined in: [types/file.ts:51](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L51)

True when the bytes were re-encoded; false when they were left alone.
