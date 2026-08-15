[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / TTSVoice

# Type Alias: TTSVoice

> **TTSVoice** = `object`

Defined in: [types/tts.ts:180](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/tts.ts#L180)

TTS voice information

## Properties

### id

> **id**: `string`

Defined in: [types/tts.ts:182](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/tts.ts#L182)

Voice identifier

---

### name

> **name**: `string`

Defined in: [types/tts.ts:184](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/tts.ts#L184)

Display name

---

### languageCode

> **languageCode**: `string`

Defined in: [types/tts.ts:186](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/tts.ts#L186)

Primary language code (e.g., "en-US")

---

### languageCodes

> **languageCodes**: `string`[]

Defined in: [types/tts.ts:188](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/tts.ts#L188)

All supported language codes

---

### gender

> **gender**: [`TTSGender`](TTSGender.md)

Defined in: [types/tts.ts:190](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/tts.ts#L190)

TTSGender

---

### type?

> `optional` **type?**: [`TTSVoiceType`](TTSVoiceType.md)

Defined in: [types/tts.ts:192](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/tts.ts#L192)

Voice type

---

### description?

> `optional` **description?**: `string`

Defined in: [types/tts.ts:194](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/tts.ts#L194)

Voice description (optional)

---

### naturalSampleRateHertz?

> `optional` **naturalSampleRateHertz?**: `number`

Defined in: [types/tts.ts:196](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/tts.ts#L196)

Natural sample rate in Hz (optional)
