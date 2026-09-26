[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ImageOrientationNormalization

# Type Alias: ImageOrientationNormalization

> **ImageOrientationNormalization** = `object`

Outcome of an EXIF-orientation pass over one image.

See `adapters/imageFormatSupport.ts` — `normalized` is false both when the
image carried no orientation tag (or an already-upright `1`) and when the
pass could not run (sharp unavailable, decode failure), so callers must not
treat it as a success flag; either way `buffer` is safe to send as-is.

## Properties

### buffer

> `readonly` **buffer**: `Buffer`

---

### normalized

> `readonly` **normalized**: `boolean`

True when the bytes were re-encoded to apply and strip EXIF orientation.
