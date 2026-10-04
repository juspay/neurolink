[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DecisionLimits

# Type Alias: DecisionLimits

> **DecisionLimits** = `object`

Input a decision provider can actually read, declared on its descriptor.

A request over either limit is refused before any network call with
`max_tokens_exceeded`, so no decision is ever made on input the model
silently cut off. Every internal consumer already treats that error as
"carry on as before".

## Properties

### maxStateTokens

> **maxStateTokens**: `number`

Estimated tokens of `state` (serialized first when it is not a string)
for any model NOT listed in `models` — an alias, a typo, a self-hosted
name — so it should be the tightest window the provider has.

---

### maxQuestions?

> `optional` **maxQuestions?**: `number`

Absent when the provider has no cap on questions per request.

---

### nonAsciiTokensPerChar?

> `optional` **nonAsciiTokensPerChar?**: `number`

Tokens charged per non-ASCII character. The default estimate assumes ~4
characters per token, which holds for English and is several times too
generous for other scripts on an English tokenizer. Absent = default
estimate for every character.

---

### digitTokensPerChar?

> `optional` **digitTokensPerChar?**: `number`

Tokens charged per ASCII digit. A tokenizer that reads every digit as its
own token makes numbers, ids and timestamps several times longer than the
default estimate of four characters per token. Absent = digits are
estimated like any other ASCII character.

---

### symbolTokensPerChar?

> `optional` **symbolTokensPerChar?**: `number`

Tokens charged per ASCII punctuation or symbol character (`,` `.` `{` `"`
`:` and the like). The same tokenizers that read each digit alone read most
punctuation alone too, so JSON, logs and lists of numbers run far above four
characters a token. Absent = punctuation is estimated like any other ASCII
character.

---

### astralTokensPerChar?

> `optional` **astralTokensPerChar?**: `number`

Tokens charged per character outside the Basic Multilingual Plane (emoji
and the like), which is counted separately from `nonAsciiTokensPerChar`
because it costs about twice as much. Absent = charged at
`nonAsciiTokensPerChar`.

---

### models?

> `optional` **models?**: `Readonly`\<`Record`\<`string`, \{ `maxStateTokens`: `number`; `nonAsciiTokensPerChar?`: `number`; \}\>\>

Per-model limits, keyed by model id; each field overrides the one above.

---

### media?

> `optional` **media?**: [`DecisionMediaLimits`](DecisionMediaLimits.md)

What the provider accepts besides text. Absent means text only.
