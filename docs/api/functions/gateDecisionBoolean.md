[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / gateDecisionBoolean

# Function: gateDecisionBoolean()

> **gateDecisionBoolean**(`answers`, `id`, `gate?`): `boolean` \| `undefined`

Read a yes/no answer as an actionable decision, or `undefined` when there
is not enough signal to act.

Three outcomes, and keeping them distinct is the whole point: `true` (a
confident yes), `false` (a confident no), and `undefined` (unanswered, the
wrong type, or too close to a coin flip). Every consumer of the `decide`
inference type needs exactly this, so the bars live here rather than being
re-invented — inconsistently — at each call site.

## Parameters

### answers

[`DecisionAnswerMap`](../type-aliases/DecisionAnswerMap.md)

### id

`string`

### gate?

[`DecisionBooleanGate`](../type-aliases/DecisionBooleanGate.md)

## Returns

`boolean` \| `undefined`
