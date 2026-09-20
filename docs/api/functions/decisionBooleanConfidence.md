[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / decisionBooleanConfidence

# Function: decisionBooleanConfidence()

> **decisionBooleanConfidence**(`probability`): `number`

Defined in: [utils/decisionAnswers.ts:73](https://github.com/juspay/neurolink/blob/release/src/lib/utils/decisionAnswers.ts#L73)

A yes/no answer carries no confidence of its own, so certainty has to be
inferred from how far the probability sits from a coin flip. 0.5 → 0, and
0 or 1 → 1.

## Parameters

### probability

`number`

## Returns

`number`
