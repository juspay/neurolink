[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DecisionLimitsQuery

# Type Alias: DecisionLimitsQuery

> **DecisionLimitsQuery** = `object`

What `NeuroLink.decisionLimits()` accepts: the same selection `decide()` takes.

## Properties

### provider?

> `optional` **provider?**: `string`

Provider name or alias; defaults to the configured decision provider.

---

### model?

> `optional` **model?**: `string`

Defaults to the provider's configured model, then its default model.

---

### credentials?

> `optional` **credentials?**: [`NeurolinkCredentials`](NeurolinkCredentials.md)
