[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MusicOptions

# Type Alias: MusicOptions

> **MusicOptions** = `object`

Options for music generation requests.

## Indexable

> \[`key`: `string`\]: `unknown`

Provider-specific additional options.

## Properties

### prompt

> **prompt**: `string`

Text prompt describing the music to generate (required).

---

### duration?

> `optional` **duration?**: `number`

Target duration in seconds. Provider-clamped to its supported range.

---

### format?

> `optional` **format?**: [`MusicAudioFormat`](MusicAudioFormat.md)

Output format (default: "mp3").

---

### genre?

> `optional` **genre?**: [`MusicGenre`](MusicGenre.md)

Genre hint (e.g. "ambient", "cinematic").

---

### mood?

> `optional` **mood?**: [`MusicMood`](MusicMood.md)

Mood / emotion hint (e.g. "uplifting", "tense").

---

### tempo?

> `optional` **tempo?**: `number`

Tempo in BPM (provider-specific support).

---

### provider?

> `optional` **provider?**: [`MusicProviderName`](MusicProviderName.md)

Override the music provider (e.g. "beatoven", "elevenlabs-music", "lyria", "replicate").

---

### referenceAudio?

> `optional` **referenceAudio?**: `Buffer` \| `string`

Reference audio for melody / style guidance (Buffer or path).

---

### output?

> `optional` **output?**: `string`

Output file path (optional — buffer is always returned in result).

---

### timeout?

> `optional` **timeout?**: `number`

Per-call timeout in ms (default: 5 minutes).
