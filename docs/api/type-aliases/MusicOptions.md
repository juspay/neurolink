[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / MusicOptions

# Type Alias: MusicOptions

> **MusicOptions** = `object`

Defined in: [types/music.ts:52](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/music.ts#L52)

Options for music generation requests.

## Indexable

> \[`key`: `string`\]: `unknown`

Provider-specific additional options.

## Properties

### prompt

> **prompt**: `string`

Defined in: [types/music.ts:54](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/music.ts#L54)

Text prompt describing the music to generate (required).

---

### duration?

> `optional` **duration?**: `number`

Defined in: [types/music.ts:57](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/music.ts#L57)

Target duration in seconds. Provider-clamped to its supported range.

---

### format?

> `optional` **format?**: [`MusicAudioFormat`](MusicAudioFormat.md)

Defined in: [types/music.ts:60](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/music.ts#L60)

Output format (default: "mp3").

---

### genre?

> `optional` **genre?**: [`MusicGenre`](MusicGenre.md)

Defined in: [types/music.ts:63](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/music.ts#L63)

Genre hint (e.g. "ambient", "cinematic").

---

### mood?

> `optional` **mood?**: [`MusicMood`](MusicMood.md)

Defined in: [types/music.ts:66](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/music.ts#L66)

Mood / emotion hint (e.g. "uplifting", "tense").

---

### tempo?

> `optional` **tempo?**: `number`

Defined in: [types/music.ts:69](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/music.ts#L69)

Tempo in BPM (provider-specific support).

---

### provider?

> `optional` **provider?**: [`MusicProviderName`](MusicProviderName.md)

Defined in: [types/music.ts:72](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/music.ts#L72)

Override the music provider (e.g. "beatoven", "elevenlabs-music", "lyria", "replicate").

---

### referenceAudio?

> `optional` **referenceAudio?**: `Buffer` \| `string`

Defined in: [types/music.ts:75](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/music.ts#L75)

Reference audio for melody / style guidance (Buffer or path).

---

### output?

> `optional` **output?**: `string`

Defined in: [types/music.ts:78](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/music.ts#L78)

Output file path (optional — buffer is always returned in result).

---

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/music.ts:81](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/music.ts#L81)

Per-call timeout in ms (default: 5 minutes).
