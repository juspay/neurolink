[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TTSVoice

# Type Alias: TTSVoice

> **TTSVoice** = `object`

Defined in: [types/tts.ts:189](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L189)

TTS voice information

## Properties

### id

> **id**: `string`

Defined in: [types/tts.ts:191](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L191)

Voice identifier

---

### name

> **name**: `string`

Defined in: [types/tts.ts:193](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L193)

Display name

---

### languageCode

> **languageCode**: `string`

Defined in: [types/tts.ts:195](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L195)

Primary language code (e.g., "en-US")

---

### languageCodes

> **languageCodes**: `string`[]

Defined in: [types/tts.ts:197](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L197)

All supported language codes

---

### gender

> **gender**: [`TTSGender`](TTSGender.md)

Defined in: [types/tts.ts:199](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L199)

TTSGender

---

### type?

> `optional` **type?**: [`TTSVoiceType`](TTSVoiceType.md)

Defined in: [types/tts.ts:201](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L201)

Voice type

---

### description?

> `optional` **description?**: `string`

Defined in: [types/tts.ts:203](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L203)

Voice description (optional)

---

### naturalSampleRateHertz?

> `optional` **naturalSampleRateHertz?**: `number`

Defined in: [types/tts.ts:205](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L205)

Natural sample rate in Hz (optional)
