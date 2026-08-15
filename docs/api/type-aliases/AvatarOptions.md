[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AvatarOptions

# Type Alias: AvatarOptions

> **AvatarOptions** = `object`

Defined in: [types/avatar.ts:42](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/avatar.ts#L42)

Options for avatar video generation.

## Indexable

> \[`key`: `string`\]: `unknown`

Provider-specific additional options.

## Properties

### image

> **image**: `Buffer` \| `string`

Defined in: [types/avatar.ts:44](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/avatar.ts#L44)

Source portrait image (Buffer, file path, or HTTPS URL).

---

### audio?

> `optional` **audio?**: `Buffer` \| `string`

Defined in: [types/avatar.ts:50](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/avatar.ts#L50)

Audio source — direct lip-sync.
Either provide `audio` OR `text` (with optional `ttsProvider` / `voice`).

---

### text?

> `optional` **text?**: `string`

Defined in: [types/avatar.ts:57](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/avatar.ts#L57)

Text for the avatar to speak. When provided without `audio`, the
NeuroLink dispatcher first runs TTS (`ttsProvider`) to produce audio,
then passes the audio to the avatar handler.

---

### ttsProvider?

> `optional` **ttsProvider?**: `string`

Defined in: [types/avatar.ts:60](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/avatar.ts#L60)

TTS provider for text → audio when `text` is used. Default: "openai-tts".

---

### voice?

> `optional` **voice?**: `string`

Defined in: [types/avatar.ts:63](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/avatar.ts#L63)

Voice id passed through to the TTS provider when `text` is used.

---

### provider?

> `optional` **provider?**: [`AvatarProviderName`](AvatarProviderName.md)

Defined in: [types/avatar.ts:66](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/avatar.ts#L66)

Avatar provider override (e.g. "d-id", "heygen", "replicate").

---

### quality?

> `optional` **quality?**: [`AvatarQuality`](AvatarQuality.md)

Defined in: [types/avatar.ts:69](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/avatar.ts#L69)

Output quality preset.

---

### format?

> `optional` **format?**: [`AvatarVideoFormat`](AvatarVideoFormat.md)

Defined in: [types/avatar.ts:72](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/avatar.ts#L72)

Output format (default: "mp4").

---

### output?

> `optional` **output?**: `string`

Defined in: [types/avatar.ts:75](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/avatar.ts#L75)

Output file path (optional — buffer is always returned in the result).

---

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/avatar.ts:78](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/avatar.ts#L78)

Per-call timeout in ms (default: 5 minutes).
