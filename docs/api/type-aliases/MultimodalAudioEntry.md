[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MultimodalAudioEntry

# Type Alias: MultimodalAudioEntry

> **MultimodalAudioEntry** = `object`

One audio file destined for native delivery to a provider.

Carries the bytes rather than a path because the decision to send audio is
made per provider, after detection has already read the file — re-reading it
from disk at dispatch time would be a second read of something already in
memory.

## Properties

### buffer

> **buffer**: `Buffer`

Raw audio bytes, as detected.

---

### filename

> **filename**: `string`

Display name; may be a full path, so log only its basename.

---

### mimeType

> **mimeType**: `string`

Detected MIME type of `buffer`.
