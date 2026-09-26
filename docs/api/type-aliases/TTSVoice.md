[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TTSVoice

# Type Alias: TTSVoice

> **TTSVoice** = `object`

TTS voice information

## Properties

### id

> **id**: `string`

Voice identifier

---

### name

> **name**: `string`

Display name

---

### languageCode

> **languageCode**: `string`

Primary language code (e.g., "en-US")

---

### languageCodes

> **languageCodes**: `string`[]

All supported language codes

---

### gender

> **gender**: [`TTSGender`](TTSGender.md)

TTSGender

---

### type?

> `optional` **type?**: [`TTSVoiceType`](TTSVoiceType.md)

Voice type

---

### description?

> `optional` **description?**: `string`

Voice description (optional)

---

### naturalSampleRateHertz?

> `optional` **naturalSampleRateHertz?**: `number`

Natural sample rate in Hz (optional)
