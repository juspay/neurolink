[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / readDecisionValue

# Function: readDecisionValue()

> **readDecisionValue**(`answers`, `id`): [`DecisionValueReading`](../type-aliases/DecisionValueReading.md) \| `undefined`

Read an extracted value. `value` is null and `unknown` true when the model
found nothing to extract, which is an answer, not a missing one: undefined
still means the id is absent or the answer was another type.

## Parameters

### answers

[`DecisionAnswerMap`](../type-aliases/DecisionAnswerMap.md)

### id

`string`

## Returns

[`DecisionValueReading`](../type-aliases/DecisionValueReading.md) \| `undefined`
