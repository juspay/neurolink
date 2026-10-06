[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliTranscribeArgs

# Type Alias: CliTranscribeArgs

> **CliTranscribeArgs** = `object`

Arguments for `neurolink transcribe <file|->`.

## Properties

### file?

> `optional` **file?**: `string`

Audio file path, or `-` to read the audio from stdin.

---

### provider?

> `optional` **provider?**: `string`

---

### model?

> `optional` **model?**: `string`

---

### language?

> `optional` **language?**: `string`

ISO / BCP-47 code, or `auto` (the default) to let the engine detect it.

---

### diarize?

> `optional` **diarize?**: `boolean`

---

### wordTimestamps?

> `optional` **wordTimestamps?**: `boolean`

---

### prompt?

> `optional` **prompt?**: `string`

---

### dictionary?

> `optional` **dictionary?**: `string`

Path to a JSON array of `{ term, heardAs, meaning }`.

---

### term?

> `optional` **term?**: `string`[]

Inline dictionary entries: `"Term|heard,as|meaning"`.

---

### correct?

> `optional` **correct?**: `boolean`

---

### rewriteProvider?

> `optional` **rewriteProvider?**: `string`

---

### rewriteModel?

> `optional` **rewriteModel?**: `string`

---

### rewrite?

> `optional` **rewrite?**: `boolean`

`--no-rewrite` sets this to `false`.

---

### transliterate?

> `optional` **transliterate?**: `"latin"` \| `"native"`

---

### secondOpinion?

> `optional` **secondOpinion?**: `string`

---

### fallback?

> `optional` **fallback?**: `string`

---

### context?

> `optional` **context?**: `string`

---

### stream?

> `optional` **stream?**: `boolean`

---

### format?

> `optional` **format?**: `"text"` \| `"json"` \| `"srt"` \| `"vtt"`

---

### timeout?

> `optional` **timeout?**: `number`

---

### quiet?

> `optional` **quiet?**: `boolean`

---

### debug?

> `optional` **debug?**: `boolean`
