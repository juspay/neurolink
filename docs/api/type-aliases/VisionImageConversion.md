[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VisionImageConversion

# Type Alias: VisionImageConversion

> **VisionImageConversion** = `object`

Outcome of a vision-compatibility pass over one image.

See `adapters/imageFormatSupport.ts` — `converted` is false both when the
source format was already universally accepted and when no decoder could
read it, so callers must not treat it as a success flag.

## Properties

### buffer

> `readonly` **buffer**: `Buffer`

---

### mimeType

> `readonly` **mimeType**: `string`

---

### converted

> `readonly` **converted**: `boolean`

True when the bytes were re-encoded; false when they were left alone.
