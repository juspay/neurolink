[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / readDecisionChoice

# Function: readDecisionChoice()

> **readDecisionChoice**(`answers`, `id`): [`DecisionChoiceReading`](../type-aliases/DecisionChoiceReading.md) \| `undefined`

Read a choice answer, including the full ranking.

`ranked` is the distribution sorted highest-first. This is what makes one
choice question over N options a ranking of all N — the basis for picking
from a large catalogue in a single request.

## Parameters

### answers

[`DecisionAnswerMap`](../type-aliases/DecisionAnswerMap.md)

### id

`string`

## Returns

[`DecisionChoiceReading`](../type-aliases/DecisionChoiceReading.md) \| `undefined`
