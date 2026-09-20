[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DecisionResult

# Type Alias: DecisionResult

> **DecisionResult** = `object`

Defined in: [types/decision.ts:132](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L132)

## Properties

### model

> **model**: `string`

Defined in: [types/decision.ts:134](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L134)

The RESOLVED model id (e.g. "jev-1.13.0"), not the alias sent.

---

### provider

> **provider**: `string`

Defined in: [types/decision.ts:135](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L135)

---

### answers

> **answers**: [`DecisionAnswerMap`](DecisionAnswerMap.md)

Defined in: [types/decision.ts:136](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L136)

---

### usage

> **usage**: [`DecisionUsage`](DecisionUsage.md)

Defined in: [types/decision.ts:137](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L137)

---

### requestId?

> `optional` **requestId?**: `string`

Defined in: [types/decision.ts:139](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L139)

Vendor request id, for support escalation.

---

### latencyMs

> **latencyMs**: `number`

Defined in: [types/decision.ts:141](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L141)

Wall-clock round trip measured client-side.

---

### upstreamMs?

> `optional` **upstreamMs?**: `number`

Defined in: [types/decision.ts:143](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L143)

Server-side time behind the edge; isolates model time from network.
