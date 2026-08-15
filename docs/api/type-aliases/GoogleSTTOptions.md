[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / GoogleSTTOptions

# Type Alias: GoogleSTTOptions

> **GoogleSTTOptions** = [`STTOptions`](STTOptions.md) & `object`

Defined in: [types/stt.ts:357](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/stt.ts#L357)

## Type Declaration

### model?

> `optional` **model?**: [`GoogleSTTModel`](GoogleSTTModel.md)

### encoding?

> `optional` **encoding?**: [`GoogleSTTAudioEncoding`](GoogleSTTAudioEncoding.md)

### sampleRateHertz?

> `optional` **sampleRateHertz?**: `number`

### audioChannelCount?

> `optional` **audioChannelCount?**: `number`

### enableSeparateRecognitionPerChannel?

> `optional` **enableSeparateRecognitionPerChannel?**: `boolean`

### alternativeLanguageCodes?

> `optional` **alternativeLanguageCodes?**: `string`[]

### maxAlternatives?

> `optional` **maxAlternatives?**: `number`

### enableAutomaticPunctuation?

> `optional` **enableAutomaticPunctuation?**: `boolean`

### enableSpokenPunctuation?

> `optional` **enableSpokenPunctuation?**: `boolean`

### enableSpokenEmojis?

> `optional` **enableSpokenEmojis?**: `boolean`

### speechContexts?

> `optional` **speechContexts?**: `object`[]

### adaptation?

> `optional` **adaptation?**: `object`

#### adaptation.phraseSets?

> `optional` **phraseSets?**: `string`[]

#### adaptation.customClasses?

> `optional` **customClasses?**: `string`[]

### useEnhanced?

> `optional` **useEnhanced?**: `boolean`

### keywords?

> `optional` **keywords?**: `string`[]
