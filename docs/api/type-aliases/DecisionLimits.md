[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DecisionLimits

# Type Alias: DecisionLimits

> **DecisionLimits** = `object`

Defined in: [types/decision.ts:154](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L154)

Input a decision provider can actually read, declared on its descriptor.

A request over either limit is refused before any network call with
`max_tokens_exceeded`, so no decision is ever made on input the model
silently cut off. Every internal consumer already treats that error as
"carry on as before".

## Properties

### maxStateTokens

> **maxStateTokens**: `number`

Defined in: [types/decision.ts:160](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L160)

Estimated tokens of `state` (serialized first when it is not a string)
for any model NOT listed in `models` — an alias, a typo, a self-hosted
name — so it should be the tightest window the provider has.

---

### maxQuestions

> **maxQuestions**: `number`

Defined in: [types/decision.ts:161](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L161)

---

### nonAsciiTokensPerChar?

> `optional` **nonAsciiTokensPerChar?**: `number`

Defined in: [types/decision.ts:168](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L168)

Tokens charged per non-ASCII character. The default estimate assumes ~4
characters per token, which holds for English and is several times too
generous for other scripts on an English tokenizer. Absent = default
estimate for every character.

---

### models?

> `optional` **models?**: `Readonly`\<`Record`\<`string`, \{ `maxStateTokens`: `number`; `nonAsciiTokensPerChar?`: `number`; \}\>\>

Defined in: [types/decision.ts:170](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L170)

Per-model limits, keyed by model id; each field overrides the one above.
