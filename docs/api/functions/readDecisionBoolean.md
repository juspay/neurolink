[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / readDecisionBoolean

# Function: readDecisionBoolean()

> **readDecisionBoolean**(`answers`, `id`): `number` \| `undefined`

Read a yes/no answer as a probability.

Returns undefined when the id is absent or the answer was a different
type — a caller can therefore tell "not answered" from "answered 0".

## Parameters

### answers

[`DecisionAnswerMap`](../type-aliases/DecisionAnswerMap.md)

### id

`string`

## Returns

`number` \| `undefined`
