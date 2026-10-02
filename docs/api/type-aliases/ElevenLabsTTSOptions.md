[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ElevenLabsTTSOptions

# Type Alias: ElevenLabsTTSOptions

> **ElevenLabsTTSOptions** = [`TTSOptions`](TTSOptions.md) & [`TTSHandlerTimeBudget`](TTSHandlerTimeBudget.md) & `object`

## Type Declaration

### model?

> `optional` **model?**: [`ElevenLabsModel`](ElevenLabsModel.md)

### stability?

> `optional` **stability?**: `number`

### similarityBoost?

> `optional` **similarityBoost?**: `number`

### style?

> `optional` **style?**: `number`

### useSpeakerBoost?

> `optional` **useSpeakerBoost?**: `boolean`

### opusBitrate?

> `optional` **opusBitrate?**: [`ElevenLabsOpusBitrate`](ElevenLabsOpusBitrate.md)

Bitrate for `format: "ogg" | "opus"` (→ `opus_48000_<kbps>`). Default 64; an unlisted value falls back to it with a warning.

### mp3Bitrate?

> `optional` **mp3Bitrate?**: [`ElevenLabsMp3Bitrate`](ElevenLabsMp3Bitrate.md)

Bitrate for `format: "mp3"` (→ `mp3_44100_<kbps>`). Default 128; an unlisted value falls back to it with a warning.

### languageCode?

> `optional` **languageCode?**: `string`

Language sent as `language_code`, an ISO 639-1 code; a BCP-47 tag is
reduced to its primary subtag (`en-US` → `en`). Sent on every model
except `eleven_multilingual_v2`, which does not accept the field (the
API ignores the code on any other model that cannot enforce it).
Falls back to the generic `TTSOptions.language`.

### voiceSettings?

> `optional` **voiceSettings?**: [`ElevenLabsVoiceSettings`](ElevenLabsVoiceSettings.md)

Raw `voice_settings` overrides; explicit fields win over the camelCase ones.

### baseUrl?

> `optional` **baseUrl?**: `string`

API base URL including the `/v1` prefix. Default
`ELEVENLABS_BASE_URL` or `https://api.elevenlabs.io/v1`.
