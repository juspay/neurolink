[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DecisionAfterEvent

# Type Alias: DecisionAfterEvent

> **DecisionAfterEvent** = `object`

Payload of the `decision:after` event, emitted once per site call whether
or not it produced a result — a decision path that stopped working must
stay observable. `result` is null when the call failed or no provider is
configured.

## Properties

### site

> **site**: [`DecisionSite`](DecisionSite.md)

---

### answers

> **answers**: [`DecisionAnswerMap`](DecisionAnswerMap.md)

NeuroLink's own answers, under its own ids. Empty when `result` is null.

---

### hostAnswers

> **hostAnswers**: [`DecisionAnswerMap`](DecisionAnswerMap.md)

The host's answers, under the host's original ids. Empty when `result` is null.

---

### latencyMs

> **latencyMs**: `number`

---

### provider?

> `optional` **provider?**: `string`

---

### model?

> `optional` **model?**: `string`

---

### result

> **result**: [`DecisionResult`](DecisionResult.md) \| `null`

---

### sessionId?

> `optional` **sessionId?**: `string`

---

### requestId?

> `optional` **requestId?**: `string`
