[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RequestLogEntry

# Type Alias: RequestLogEntry

> **RequestLogEntry** = `object`

Defined in: [types/proxy.ts:664](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L664)

## Properties

### timestamp

> **timestamp**: `string`

Defined in: [types/proxy.ts:665](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L665)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:666](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L666)

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:667](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L667)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:668](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L668)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:669](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L669)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:670](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L670)

---

### toolCount

> **toolCount**: `number`

Defined in: [types/proxy.ts:671](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L671)

---

### account

> **account**: `string`

Defined in: [types/proxy.ts:672](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L672)

---

### accountType

> **accountType**: `string`

Defined in: [types/proxy.ts:673](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L673)

---

### responseStatus

> **responseStatus**: `number`

Defined in: [types/proxy.ts:674](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L674)

---

### responseTimeMs

> **responseTimeMs**: `number`

Defined in: [types/proxy.ts:675](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L675)

---

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:676](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L676)

---

### errorMessage?

> `optional` **errorMessage?**: `string`

Defined in: [types/proxy.ts:677](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L677)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:679](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L679)

Low-level transport code such as ETIMEDOUT or EADDRNOTAVAIL.

---

### transportScope?

> `optional` **transportScope?**: [`ProxyTransportScope`](ProxyTransportScope.md)

Defined in: [types/proxy.ts:681](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L681)

Whether changing credentials can affect this transport failure.

---

### inputTokens?

> `optional` **inputTokens?**: `number`

Defined in: [types/proxy.ts:682](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L682)

---

### outputTokens?

> `optional` **outputTokens?**: `number`

Defined in: [types/proxy.ts:683](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L683)

---

### cacheCreationTokens?

> `optional` **cacheCreationTokens?**: `number`

Defined in: [types/proxy.ts:684](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L684)

---

### cacheReadTokens?

> `optional` **cacheReadTokens?**: `number`

Defined in: [types/proxy.ts:685](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L685)

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/proxy.ts:691](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L691)

Provider that actually served the request, for costing. Absent on records
written before this field existed; `proxyAnalysis` then falls back to a
cross-provider model lookup rather than assuming Anthropic.

---

### clientApp?

> `optional` **clientApp?**: `string`

Defined in: [types/proxy.ts:701](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L701)

Which CLI made the request, derived from User-Agent, and the raw header it
was derived from.

Both are stored. The derived name is what a dashboard groups on, but the
classifier only knows the clients it has seen — keeping the raw header
means a client it does not recognise is still attributable rather than
collapsing into "unknown" with everything else.

---

### userAgent?

> `optional` **userAgent?**: `string`

Defined in: [types/proxy.ts:703](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L703)

Raw User-Agent, truncated. See clientApp.

---

### traceId?

> `optional` **traceId?**: `string`

Defined in: [types/proxy.ts:705](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L705)

OTel trace ID for correlation with distributed traces

---

### spanId?

> `optional` **spanId?**: `string`

Defined in: [types/proxy.ts:707](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L707)

OTel span ID for correlation with distributed traces

---

### routingDecision?

> `optional` **routingDecision?**: [`ProxyAccountRoutingDecision`](ProxyAccountRoutingDecision.md)

Defined in: [types/proxy.ts:709](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L709)

Exact secret-free inputs and result of initial account selection.
