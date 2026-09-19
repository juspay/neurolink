[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MultimodalAudioEntry

# Type Alias: MultimodalAudioEntry

> **MultimodalAudioEntry** = `object`

Defined in: [types/file.ts:102](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L102)

One audio file destined for native delivery to a provider.

Carries the bytes rather than a path because the decision to send audio is
made per provider, after detection has already read the file — re-reading it
from disk at dispatch time would be a second read of something already in
memory.

## Properties

### buffer

> **buffer**: `Buffer`

Defined in: [types/file.ts:104](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L104)

Raw audio bytes, as detected.

---

### filename

> **filename**: `string`

Defined in: [types/file.ts:106](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L106)

Display name; may be a full path, so log only its basename.

---

### mimeType

> **mimeType**: `string`

Defined in: [types/file.ts:108](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L108)

Detected MIME type of `buffer`.
