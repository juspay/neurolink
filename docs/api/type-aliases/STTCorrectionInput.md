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

### language?

> `optional` **language?**: `string`

Detected language of the speech; picks the rewrite's rules and script default.

---

### previous?

> `optional` **previous?**: readonly `string`[]

Corrected utterances before this one, oldest first: read-only context for the rewrite.

---

### onPartial?

> `optional` **onPartial?**: (`text`) => `void`

#### Parameters

##### text

`string`

#### Returns

`void`
