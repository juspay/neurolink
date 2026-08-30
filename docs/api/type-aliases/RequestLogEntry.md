[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RequestLogEntry

# Type Alias: RequestLogEntry

> **RequestLogEntry** = `object`

Defined in: [types/proxy.ts:665](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L665)

## Properties

### timestamp

> **timestamp**: `string`

Defined in: [types/proxy.ts:666](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L666)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:667](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L667)

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:668](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L668)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:669](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L669)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:670](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L670)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:671](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L671)

---

### toolCount

> **toolCount**: `number`

Defined in: [types/proxy.ts:672](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L672)

---

### account

> **account**: `string`

Defined in: [types/proxy.ts:673](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L673)

---

### accountKey?

> `optional` **accountKey?**: `string`

Defined in: [types/proxy.ts:675](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L675)

Provider-qualified account key for collision-free reconstruction.

---

### accountType

> **accountType**: `string`

Defined in: [types/proxy.ts:676](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L676)

---

### responseStatus

> **responseStatus**: `number`

Defined in: [types/proxy.ts:677](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L677)

---

### responseTimeMs

> **responseTimeMs**: `number`

Defined in: [types/proxy.ts:678](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L678)

---

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:679](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L679)

---

### errorMessage?

> `optional` **errorMessage?**: `string`

Defined in: [types/proxy.ts:680](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L680)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:682](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L682)

Low-level transport code such as ETIMEDOUT or EADDRNOTAVAIL.

---

### transportScope?

> `optional` **transportScope?**: [`ProxyTransportScope`](ProxyTransportScope.md)

Defined in: [types/proxy.ts:684](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L684)

Whether changing credentials can affect this transport failure.

---

### inputTokens?

> `optional` **inputTokens?**: `number`

Defined in: [types/proxy.ts:685](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L685)

---

### outputTokens?

> `optional` **outputTokens?**: `number`

Defined in: [types/proxy.ts:686](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L686)

---

### cacheCreationTokens?

> `optional` **cacheCreationTokens?**: `number`

Defined in: [types/proxy.ts:687](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L687)

---

### cacheReadTokens?

> `optional` **cacheReadTokens?**: `number`

Defined in: [types/proxy.ts:688](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L688)

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/proxy.ts:694](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L694)

Provider that actually served the request, for costing. Absent on records
written before this field existed; `proxyAnalysis` then falls back to a
cross-provider model lookup rather than assuming Anthropic.

---

### terminalOutcome?

> `optional` **terminalOutcome?**: `"completed"` \| `"bodyless"` \| `"client_cancelled"` \| `"stream_error"` \| `"handler_error"`

Defined in: [types/proxy.ts:696](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L696)

Terminal state of the client-facing response when known.

---

### clientApp?

> `optional` **clientApp?**: `string`

Defined in: [types/proxy.ts:711](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L711)

Which CLI made the request, derived from User-Agent, and the raw header it
was derived from.

Both are stored. The derived name is what a dashboard groups on, but the
classifier only knows the clients it has seen — keeping the raw header
means a client it does not recognise is still attributable rather than
collapsing into "unknown" with everything else.

---

### userAgent?

> `optional` **userAgent?**: `string`

Defined in: [types/proxy.ts:713](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L713)

Raw User-Agent, truncated. See clientApp.

---

### traceId?

> `optional` **traceId?**: `string`

Defined in: [types/proxy.ts:715](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L715)

OTel trace ID for correlation with distributed traces

---

### spanId?

> `optional` **spanId?**: `string`

Defined in: [types/proxy.ts:717](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L717)

OTel span ID for correlation with distributed traces

---

### routingDecision?

> `optional` **routingDecision?**: [`ProxyAccountRoutingDecision`](ProxyAccountRoutingDecision.md)

Defined in: [types/proxy.ts:719](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L719)

Exact secret-free inputs and result of initial account selection.
