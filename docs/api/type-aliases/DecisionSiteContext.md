[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DecisionSiteContext

# Type Alias: DecisionSiteContext

> **DecisionSiteContext** = `object`

What an internal decision site inherits from the `generate()` / `stream()`
call it runs inside: the per-call credentials (so the decision goes to the
caller's provider account, not the instance's), the abort signal, and the
ids a host's [DecisionHooks](DecisionHooks.md) may want to correlate on.

## Properties

### credentials?

> `optional` **credentials?**: [`NeurolinkCredentials`](NeurolinkCredentials.md)

---

### signal?

> `optional` **signal?**: `AbortSignal`

---

### sessionId?

> `optional` **sessionId?**: `string`

---

### requestId?

> `optional` **requestId?**: `string`
