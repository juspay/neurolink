[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AudioConversionResult

# Type Alias: AudioConversionResult

> **AudioConversionResult** = `object`

Defined in: [types/file.ts:49](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/file.ts#L49)

Outcome of an audio-compatibility pass over one file.

See `adapters/audioFormatSupport.ts`. As with images, `converted` is false
both when the container was already acceptable and when nothing could
re-encode it, so it is not a success flag — the caller decides what to do
from the resulting `mimeType`.

## Properties

### buffer

> `readonly` **buffer**: `Buffer`

Defined in: [types/file.ts:50](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/file.ts#L50)

---

### mimeType

> `readonly` **mimeType**: `string`

Defined in: [types/file.ts:51](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/file.ts#L51)

---

### converted

> `readonly` **converted**: `boolean`

Defined in: [types/file.ts:53](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/file.ts#L53)

True when the bytes were re-encoded; false when they were left alone.
