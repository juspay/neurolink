[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / STTCorrectionInput

# Type Alias: STTCorrectionInput

> **STTCorrectionInput** = `object`

Input to the correction layer, independent of where the text came from.

## Properties

### text

> **text**: `string`

---

### secondOpinion?

> `optional` **secondOpinion?**: `string`

Second-opinion transcript of the same audio, when one exists.

---

### dictionary?

> `optional` **dictionary?**: [`STTDictionaryEntry`](STTDictionaryEntry.md)[]

---

### options?

> `optional` **options?**: [`STTCorrectionOptions`](STTCorrectionOptions.md)

---

### languageDetected?

> `optional` **languageDetected?**: `boolean`

`false` when the primary engine reported a low language score: the second opinion then leads.

---

### onPartial?

> `optional` **onPartial?**: (`text`) => `void`

#### Parameters

##### text

`string`

#### Returns

`void`
