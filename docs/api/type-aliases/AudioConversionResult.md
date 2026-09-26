[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AudioConversionResult

# Type Alias: AudioConversionResult

> **AudioConversionResult** = `object`

Outcome of an audio-compatibility pass over one file.

See `adapters/audioFormatSupport.ts`. As with images, `converted` is false
both when the container was already acceptable and when nothing could
re-encode it, so it is not a success flag — the caller decides what to do
from the resulting `mimeType`.

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
