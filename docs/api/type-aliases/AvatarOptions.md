[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AvatarOptions

# Type Alias: AvatarOptions

> **AvatarOptions** = `object`

Options for avatar video generation.

## Indexable

> \[`key`: `string`\]: `unknown`

Provider-specific additional options.

## Properties

### image

> **image**: `Buffer` \| `string`

Source portrait image (Buffer, file path, or HTTPS URL).

---

### audio?

> `optional` **audio?**: `Buffer` \| `string`

Audio source — direct lip-sync.
Either provide `audio` OR `text` (with optional `ttsProvider` / `voice`).

---

### text?

> `optional` **text?**: `string`

Text for the avatar to speak. When provided without `audio`, the
NeuroLink dispatcher first runs TTS (`ttsProvider`) to produce audio,
then passes the audio to the avatar handler.

---

### ttsProvider?

> `optional` **ttsProvider?**: `string`

TTS provider for text → audio when `text` is used. Default: "openai-tts".

---

### voice?

> `optional` **voice?**: `string`

Voice id passed through to the TTS provider when `text` is used.

---

### provider?

> `optional` **provider?**: [`AvatarProviderName`](AvatarProviderName.md)

Avatar provider override (e.g. "d-id", "heygen", "replicate").

---

### quality?

> `optional` **quality?**: [`AvatarQuality`](AvatarQuality.md)

Output quality preset.

---

### format?

> `optional` **format?**: [`AvatarVideoFormat`](AvatarVideoFormat.md)

Output format (default: "mp4").

---

### output?

> `optional` **output?**: `string`

Output file path (optional — buffer is always returned in the result).

---

### timeout?

> `optional` **timeout?**: `number`

Per-call timeout in ms (default: 5 minutes).
