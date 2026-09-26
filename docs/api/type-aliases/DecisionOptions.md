[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DecisionOptions

# Type Alias: DecisionOptions

> **DecisionOptions** = [`DecisionRequest`](DecisionRequest.md) & `object`

What `NeuroLink.decide()` accepts: a decision request plus the usual
provider/credential selection every inference type shares.

## Type Declaration

### provider?

> `optional` **provider?**: `string`

Provider name or alias. Defaults to the first registered provider whose
descriptor declares `"decide"` in `inferenceKinds`.

### credentials?

> `optional` **credentials?**: [`NeurolinkCredentials`](NeurolinkCredentials.md)

Per-call credential overrides, as `generate()` takes.
