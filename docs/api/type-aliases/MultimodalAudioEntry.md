[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MultimodalAudioEntry

# Type Alias: MultimodalAudioEntry

> **MultimodalAudioEntry** = `object`

Defined in: [types/file.ts:117](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L117)

One audio file destined for native delivery to a provider.

Carries the bytes rather than a path because the decision to send audio is
made per provider, after detection has already read the file — re-reading it
from disk at dispatch time would be a second read of something already in
memory.

## Properties

### buffer

> **buffer**: `Buffer`

Defined in: [types/file.ts:119](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L119)

Raw audio bytes, as detected.

---

### filename

> **filename**: `string`

Defined in: [types/file.ts:121](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L121)

Display name; may be a full path, so log only its basename.

---

### mimeType

> **mimeType**: `string`

Defined in: [types/file.ts:123](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L123)

Detected MIME type of `buffer`.
