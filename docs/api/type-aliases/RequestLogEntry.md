[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RequestLogEntry

# Type Alias: RequestLogEntry

> **RequestLogEntry** = `object`

Defined in: [types/proxy.ts:672](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L672)

## Properties

### firstUsefulOutputMs?

> `optional` **firstUsefulOutputMs?**: `number`

Defined in: [types/proxy.ts:674](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L674)

First text, refusal or populated tool output, excluding SSE control frames.

---

### firstUsefulOutputStatus?

> `optional` **firstUsefulOutputStatus?**: `"observed"` \| `"no_useful_output"` \| `"not_observed"`

Defined in: [types/proxy.ts:676](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L676)

Why first-useful-output timing is absent; never substitute a zero.

---

### firstUsefulOutputEvent?

> `optional` **firstUsefulOutputEvent?**: `string`

Defined in: [types/proxy.ts:678](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L678)

Native protocol event that established the first useful output.

---

### firstUsefulOutputUnavailableReason?

> `optional` **firstUsefulOutputUnavailableReason?**: `string`

Defined in: [types/proxy.ts:680](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L680)

Why first-output timing could not be established for this response.

---

### reasoningEffort?

> `optional` **reasoningEffort?**: `string`

Defined in: [types/proxy.ts:682](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L682)

Requested reasoning effort retained independently of body capture.

---

### fallbackPlan?

> `optional` **fallbackPlan?**: `object`[]

Defined in: [types/proxy.ts:684](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L684)

Small routing evidence retained even when response bodies are pruned.

#### provider

> **provider**: `string`

#### model

> **model**: `string`

#### reasoningEffort?

> `optional` **reasoningEffort?**: `string`

---

### timestamp

> **timestamp**: `string`

Defined in: [types/proxy.ts:689](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L689)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:690](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L690)

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:691](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L691)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:692](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L692)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:693](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L693)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:694](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L694)

---

### toolCount

> **toolCount**: `number`

Defined in: [types/proxy.ts:695](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L695)

---

### account

> **account**: `string`

Defined in: [types/proxy.ts:696](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L696)

---

### accountKey?

> `optional` **accountKey?**: `string`

Defined in: [types/proxy.ts:698](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L698)

Provider-qualified account key for collision-free reconstruction.

---

### accountType

> **accountType**: `string`

Defined in: [types/proxy.ts:699](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L699)

---

### responseStatus

> **responseStatus**: `number`

Defined in: [types/proxy.ts:700](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L700)

---

### responseTimeMs

> **responseTimeMs**: `number`

Defined in: [types/proxy.ts:701](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L701)

---

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:702](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L702)

---

### errorMessage?

> `optional` **errorMessage?**: `string`

Defined in: [types/proxy.ts:703](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L703)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:705](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L705)

Low-level transport code such as ETIMEDOUT or EADDRNOTAVAIL.

---

### transportScope?

> `optional` **transportScope?**: [`ProxyTransportScope`](ProxyTransportScope.md)

Defined in: [types/proxy.ts:707](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L707)

Whether changing credentials can affect this transport failure.

---

### inputTokens?

> `optional` **inputTokens?**: `number`

Defined in: [types/proxy.ts:708](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L708)

---

### outputTokens?

> `optional` **outputTokens?**: `number`

Defined in: [types/proxy.ts:709](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L709)

---

### cacheCreationTokens?

> `optional` **cacheCreationTokens?**: `number`

Defined in: [types/proxy.ts:710](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L710)

---

### cacheReadTokens?

> `optional` **cacheReadTokens?**: `number`

Defined in: [types/proxy.ts:711](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L711)

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/proxy.ts:717](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L717)

Provider that actually served the request, for costing. Absent on records
written before this field existed; `proxyAnalysis` then falls back to a
cross-provider model lookup rather than assuming Anthropic.

---

### terminalOutcome?

> `optional` **terminalOutcome?**: `"completed"` \| `"bodyless"` \| `"client_cancelled"` \| `"stream_error"` \| `"handler_error"`

Defined in: [types/proxy.ts:719](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L719)

Terminal state of the client-facing response when known.

---

### clientApp?

> `optional` **clientApp?**: `string`

Defined in: [types/proxy.ts:734](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L734)

Which CLI made the request, derived from User-Agent, and the raw header it
was derived from.

Both are stored. The derived name is what a dashboard groups on, but the
classifier only knows the clients it has seen — keeping the raw header
means a client it does not recognise is still attributable rather than
collapsing into "unknown" with everything else.

---

### userAgent?

> `optional` **userAgent?**: `string`

Defined in: [types/proxy.ts:736](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L736)

Raw User-Agent, truncated. See clientApp.

---

### traceId?

> `optional` **traceId?**: `string`

Defined in: [types/proxy.ts:738](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L738)

OTel trace ID for correlation with distributed traces

---

### spanId?

> `optional` **spanId?**: `string`

Defined in: [types/proxy.ts:740](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L740)

OTel span ID for correlation with distributed traces

---

### traceFlags?

> `optional` **traceFlags?**: `number`

Defined in: [types/proxy.ts:742](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L742)

Original OTel sampling flags retained through deferred logging.

---

### routingDecision?

> `optional` **routingDecision?**: [`ProxyAccountRoutingDecision`](ProxyAccountRoutingDecision.md)

Defined in: [types/proxy.ts:744](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L744)

Exact secret-free inputs and result of initial account selection.
