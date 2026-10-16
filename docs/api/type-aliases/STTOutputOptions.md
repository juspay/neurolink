[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / STTOutputOptions

# Type Alias: STTOutputOptions

> **STTOutputOptions** = `object`

Renderings of every utterance in other languages and scripts. Each entry
of `languages` is a BCP-47 tag: `"es"`, `"fr-CA"`, `"ta"` translate;
`"hi-Latn"` is Hindi written in Latin letters (romanized when Hindi was
spoken, translated into Hinglish when something else was); `"source"` is
the transcript itself. One model call renders all of them, from the
native-script transcript and its corrected form, with earlier utterances
as context. A rendering never touches `text`: a failed one is reported with
its status and the transcript is unchanged.

## Properties

### languages

> **languages**: readonly `string`[] \| [`STTOutputLanguageSource`](STTOutputLanguageSource.md)

---

### provider?

> `optional` **provider?**: `string`

Text provider for the rendering; default `NEUROLINK_STT_OUTPUT_PROVIDER`, then the rewrite's.

---

### model?

> `optional` **model?**: `string`

Default `NEUROLINK_STT_OUTPUT_MODEL`, then the rewrite's.

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Per call; on expiry the rendering is reported as `"timeout"`. Default 15000.

---

### contextUtterances?

> `optional` **contextUtterances?**: `number`

Earlier utterances (and their renderings) given as context. Default 3; 0 turns it off.

---

### glossary?

> `optional` **glossary?**: `boolean`

Keep dictionary terms exactly as written in every language. Default true.
