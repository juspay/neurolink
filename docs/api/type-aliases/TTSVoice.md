[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / TTSVoice

# Type Alias: TTSVoice

> **TTSVoice** = `object`

Defined in: [types/tts.ts:162](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tts.ts#L162)

TTS voice information

## Properties

### id

> **id**: `string`

Defined in: [types/tts.ts:164](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tts.ts#L164)

Voice identifier

---

### name

> **name**: `string`

Defined in: [types/tts.ts:166](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tts.ts#L166)

Display name

---

### languageCode

> **languageCode**: `string`

Defined in: [types/tts.ts:168](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tts.ts#L168)

Primary language code (e.g., "en-US")

---

### languageCodes

> **languageCodes**: `string`[]

Defined in: [types/tts.ts:170](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tts.ts#L170)

All supported language codes

---

### gender

> **gender**: [`TTSGender`](TTSGender.md)

Defined in: [types/tts.ts:172](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tts.ts#L172)

TTSGender

---

### type?

> `optional` **type?**: [`TTSVoiceType`](TTSVoiceType.md)

Defined in: [types/tts.ts:174](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tts.ts#L174)

Voice type

---

### description?

> `optional` **description?**: `string`

Defined in: [types/tts.ts:176](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tts.ts#L176)

Voice description (optional)

---

### naturalSampleRateHertz?

> `optional` **naturalSampleRateHertz?**: `number`

Defined in: [types/tts.ts:178](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tts.ts#L178)

Natural sample rate in Hz (optional)
