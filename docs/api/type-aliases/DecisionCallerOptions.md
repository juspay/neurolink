[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DecisionCallerOptions

# Type Alias: DecisionCallerOptions

> **DecisionCallerOptions** = [`DecisionOptions`](DecisionOptions.md) & `object`

Options an internal decision site hands its caller: the public
[DecisionOptions](DecisionOptions.md) plus in-process context that never reaches the
wire. A bound `NeuroLink.tryDecide` accepts it unchanged; a host wrapping
one can read `site` to see which consumer is asking.

## Type Declaration

### site?

> `optional` **site?**: [`DecisionSite`](DecisionSite.md)

Which built-in consumer is asking. Unset on a host's own `tryDecide` call.

### sessionId?

> `optional` **sessionId?**: `string`

The conversation the outer request belongs to. Never sent to the model.

### requestId?

> `optional` **requestId?**: `string`

The outer request's id. Never sent to the model.
