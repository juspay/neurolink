[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / STTCorrectionOptions

# Type Alias: STTCorrectionOptions

> **STTCorrectionOptions** = `object`

The correction layer that runs on a finished transcript (or each final utterance when streaming).

## Properties

### enabled?

> `optional` **enabled?**: `boolean`

Default: on when a dictionary is given, or when this object is given at
all with `rewrite` not `false`; off otherwise.

---

### guard?

> `optional` **guard?**: `"decide"` \| `"none"`

Guard for dictionary substitutions. `"decide"` asks the decision provider
per candidate (term or literal?) and applies the dictionary as is when no
decision provider is configured or the call fails; `"none"` always applies it.

---

### decideTimeoutMs?

> `optional` **decideTimeoutMs?**: `number`

Timeout for the guard call; on expiry the dictionary is applied as is. Default 4000.

---

### rewrite?

> `optional` **rewrite?**: `false` \| \{ `provider?`: `string`; `model?`: `string`; `timeoutMs?`: `number`; \}

LLM rewrite: spelling, punctuation, dictionary terms, transliteration.
`false` disables it (dictionary-only correction). `provider`/`model` name
any text provider; the instance default is used when omitted.

#### Union Members

`false`

---

##### Type Literal

\{ `provider?`: `string`; `model?`: `string`; `timeoutMs?`: `number`; \}

##### provider?

> `optional` **provider?**: `string`

##### model?

> `optional` **model?**: `string`

##### timeoutMs?

> `optional` **timeoutMs?**: `number`

On expiry the un-rewritten text is kept. Default 12000.

---

### transliterate?

> `optional` **transliterate?**: `"latin"` \| `"native"`

How Indic-script text is written: `"latin"` the way people type on phones
(Hinglish / Tanglish — the default), `"native"` keeps the script. Never a translation.

---

### punctuate?

> `optional` **punctuate?**: `boolean`

Add punctuation and capitalization in the rewrite. Default true.

---

### secondOpinion?

> `optional` **secondOpinion?**: `object`

A second engine run on the same audio; the rewrite reconciles both
transcripts (Indian-language words from an Indic engine, English words
from an English-oriented one).

#### provider

> **provider**: `string`

#### model?

> `optional` **model?**: `string`

---

### context?

> `optional` **context?**: `string`

One sentence about who is talking and about what; sent to the engines and the guard.

---

### maxDropRatio?

> `optional` **maxDropRatio?**: `number`

A rewrite that drops more than this share of the words is discarded. Default 0.25.
