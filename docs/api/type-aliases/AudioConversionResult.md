[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AudioConversionResult

# Type Alias: AudioConversionResult

> **AudioConversionResult** = `object`

Defined in: [types/file.ts:87](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L87)

Outcome of an audio-compatibility pass over one file.

See `adapters/audioFormatSupport.ts`. As with images, `converted` is false
both when the container was already acceptable and when nothing could
re-encode it, so it is not a success flag — the caller decides what to do
from the resulting `mimeType`.

## Properties

### buffer

> `readonly` **buffer**: `Buffer`

Defined in: [types/file.ts:88](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L88)

---

### mimeType

> `readonly` **mimeType**: `string`

Defined in: [types/file.ts:89](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L89)

---

### converted

> `readonly` **converted**: `boolean`

Defined in: [types/file.ts:91](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L91)

True when the bytes were re-encoded; false when they were left alone.
