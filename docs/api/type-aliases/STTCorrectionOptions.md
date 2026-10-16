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

> `optional` **rewrite?**: `false` \| `"auto"` \| \{ `provider?`: `string`; `model?`: `string`; `timeoutMs?`: `number`; `mode?`: `"auto"` \| `"always"`; \}

LLM rewrite: spelling, punctuation, dictionary terms, transliteration.
`false` disables it (dictionary-only correction). `provider`/`model` name
any text provider; the instance default is used when omitted.

#### Union Members

`false`

---

`"auto"`

---

##### Type Literal

\{ `provider?`: `string`; `model?`: `string`; `timeoutMs?`: `number`; `mode?`: `"auto"` \| `"always"`; \}

##### provider?

> `optional` **provider?**: `string`

##### model?

> `optional` **model?**: `string`

##### timeoutMs?

> `optional` **timeoutMs?**: `number`

On expiry the un-rewritten text is kept. Default 12000.

##### mode?

> `optional` **mode?**: `"auto"` \| `"always"`

`"auto"` (the default) runs the rewrite only when there is something for it to do; `"always"` runs it on every text.

---

### perSentence?

> `optional` **perSentence?**: `boolean`

Correct a final utterance sentence by sentence (split on terminal
punctuation and the danda): each sentence decides its own script and
whether it needs the rewrite, and sentences are corrected in parallel.
Default true. A second opinion is whole-utterance and keeps one pass.

---

### transliterate?

> `optional` **transliterate?**: `"latin"` \| `"native"`

How Indic-script text is written: `"latin"` the way people type on phones
(Hinglish / Tanglish), `"native"` keeps the script. Never a translation.
Unset, Indian languages default to `"latin"` and every other language
keeps its own script (Arabic, CJK, Cyrillic … are never romanized unless
asked for). For any other rendering of the text, see `output.languages`.

---

### punctuate?

> `optional` **punctuate?**: `boolean`

Add punctuation and capitalization in the rewrite. Default true.

---

### cleanup?

> `optional` **cleanup?**: `"verbatim"` \| `"clean"`

`"verbatim"` (the default) keeps every word, fillers and stutters
included. `"clean"` lets the rewrite remove fillers ("um", "like" as a
filler) and stutters ("they they they"), never content, and allows the
rewrite to drop up to half the words to do so.

---

### secondOpinion?

> `optional` **secondOpinion?**: \{ `provider`: `string`; `model?`: `string`; \} \| `"auto"`

A second engine run on the same audio; the rewrite reconciles both
transcripts (Indian-language words from an Indic engine, English words
from an English-oriented one). `"auto"` uses the `fallback` engine as the
second opinion on every utterance the primary leads, so code-mixed speech
gets both readings without naming a provider twice.

---

### context?

> `optional` **context?**: `string`

One sentence about who is talking and about what; sent to the engines and the guard.

---

### maxDropRatio?

> `optional` **maxDropRatio?**: `number`

A rewrite that drops more than this share of the words is discarded. Default 0.25.

---

### contextUtterances?

> `optional` **contextUtterances?**: `number`

Corrected utterances before this one that the rewrite sees as read-only
context, so names, spellings and script stay consistent across a
conversation. Streaming and `chunking: "utterances"` only. Default 0
(off): a rewrite may copy context into its answer, which the added-words
guard rejects, so it is opt-in until measured.
