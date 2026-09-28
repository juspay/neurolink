[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / estimateDecisionStateTokens

# Function: estimateDecisionStateTokens()

> **estimateDecisionStateTokens**(`state`, `limits?`): `number`

Estimate how many tokens a decision model will read from `state`.

`estimateTokens` assumes ~4 characters per token. That holds for English
and is several times too generous for other scripts on an English
tokenizer, so when the limits declare a `nonAsciiTokensPerChar` rate,
non-ASCII characters are counted at it instead. A non-string state is
serialized first, as it is on the wire.

This is the estimator the pre-flight refusal uses: a state this reports at
or under `maxStateTokens` is sent, one over it is refused before any
network call.

## Parameters

### state

[`DecisionInput`](../type-aliases/DecisionInput.md)

### limits?

`Pick`\<[`DecisionLimits`](../type-aliases/DecisionLimits.md), `"nonAsciiTokensPerChar"`\>

## Returns

`number`
