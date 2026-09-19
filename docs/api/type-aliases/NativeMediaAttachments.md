[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NativeMediaAttachments

# Type Alias: NativeMediaAttachments

> **NativeMediaAttachments** = `object`

Defined in: [types/file.ts:139](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L139)

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

Defined in: [types/file.ts:140](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L140)

---

### video?

> `readonly` `optional` **video?**: [`MultimodalVideoEntry`](MultimodalVideoEntry.md)[]

Defined in: [types/file.ts:141](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L141)
