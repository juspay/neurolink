[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DecisionResult

# Type Alias: DecisionResult

> **DecisionResult** = `object`

## Properties

### model

> **model**: `string`

The RESOLVED model id (e.g. "jev-1.13.0"), not the alias sent.

---

### provider

> **provider**: `string`

---

### answers

> **answers**: [`DecisionAnswerMap`](DecisionAnswerMap.md)

---

### usage

> **usage**: [`DecisionUsage`](DecisionUsage.md)

---

### requestId?

> `optional` **requestId?**: `string`

Vendor request id, for support escalation.

---

### latencyMs

> **latencyMs**: `number`

Wall-clock round trip measured client-side.

---

### upstreamMs?

> `optional` **upstreamMs?**: `number`

Server-side time behind the edge; isolates model time from network.
