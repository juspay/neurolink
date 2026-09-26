[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NativeMediaAttachments

# Type Alias: NativeMediaAttachments

> **NativeMediaAttachments** = `object`

Defined in: [types/file.ts:154](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L154)

Media collected during file detection that a provider may be able to
consume directly, rather than as a text summary.

Grouped rather than passed as two more positional parameters: the message
converters already take text, images, PDFs, provider and model, and each
new modality added one more argument to a call nobody could read. A bag
also means the next modality is a field, not another signature change at
every call site.

## Properties

### audio?

> `readonly` `optional` **audio?**: [`MultimodalAudioEntry`](MultimodalAudioEntry.md)[]

Defined in: [types/file.ts:155](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L155)

---

### video?

> `readonly` `optional` **video?**: [`MultimodalVideoEntry`](MultimodalVideoEntry.md)[]

Defined in: [types/file.ts:156](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L156)

---

### outputFormat?

> `readonly` `optional` **outputFormat?**: [`VisionImageOutputFormat`](VisionImageOutputFormat.md)

Defined in: [types/file.ts:163](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L163)

Transcode target for an incompatible image (see
`GenerateOptions.imageOptions`). Not itself a native attachment, but
bundled here for the same reason audio and video are: it is one more
per-request option the message converters need at the same call sites.
