[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RequestLogEntry

# Type Alias: RequestLogEntry

> **RequestLogEntry** = `object`

Defined in: [types/proxy.ts:673](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L673)

## Properties

### firstUsefulOutputMs?

> `optional` **firstUsefulOutputMs?**: `number`

Defined in: [types/proxy.ts:675](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L675)

First text, refusal or populated tool output, excluding SSE control frames.

---

### firstUsefulOutputStatus?

> `optional` **firstUsefulOutputStatus?**: `"observed"` \| `"no_useful_output"` \| `"not_observed"`

Defined in: [types/proxy.ts:677](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L677)

Why first-useful-output timing is absent; never substitute a zero.

---

### firstUsefulOutputEvent?

> `optional` **firstUsefulOutputEvent?**: `string`

Defined in: [types/proxy.ts:679](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L679)

Native protocol event that established the first useful output.

---

### firstUsefulOutputUnavailableReason?

> `optional` **firstUsefulOutputUnavailableReason?**: `string`

Defined in: [types/proxy.ts:681](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L681)

Why first-output timing could not be established for this response.

---

### reasoningEffort?

> `optional` **reasoningEffort?**: `string`

Defined in: [types/proxy.ts:683](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L683)

Requested reasoning effort retained independently of body capture.

---

### fallbackPlan?

> `optional` **fallbackPlan?**: `object`[]

Defined in: [types/proxy.ts:685](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L685)

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

Defined in: [types/proxy.ts:690](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L690)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:691](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L691)

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:692](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L692)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:693](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L693)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:694](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L694)

---

### requestedModel?

> `optional` **requestedModel?**: `string`

Defined in: [types/proxy.ts:696](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L696)

Client model when a different upstream model served the request.

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:697](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L697)

---

### toolCount

> **toolCount**: `number`

Defined in: [types/proxy.ts:698](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L698)

---

### account

> **account**: `string`

Defined in: [types/proxy.ts:699](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L699)

---

### accountKey?

> `optional` **accountKey?**: `string`

Defined in: [types/proxy.ts:701](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L701)

Provider-qualified account key for collision-free reconstruction.

---

### accountType

> **accountType**: `string`

Defined in: [types/proxy.ts:702](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L702)

---

### responseStatus

> **responseStatus**: `number`

Defined in: [types/proxy.ts:703](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L703)

---

### responseTimeMs

> **responseTimeMs**: `number`

Defined in: [types/proxy.ts:704](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L704)

---

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:705](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L705)

---

### errorMessage?

> `optional` **errorMessage?**: `string`

Defined in: [types/proxy.ts:706](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L706)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:708](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L708)

Low-level transport code such as ETIMEDOUT or EADDRNOTAVAIL.

---

### transportScope?

> `optional` **transportScope?**: [`ProxyTransportScope`](ProxyTransportScope.md)

Defined in: [types/proxy.ts:710](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L710)

Whether changing credentials can affect this transport failure.

---

### inputIncludesCachedTokens?

> `optional` **inputIncludesCachedTokens?**: `boolean`

Defined in: [types/proxy.ts:712](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L712)

True when input includes the cache breakdown (native Codex wire usage).

---

### inputTokens?

> `optional` **inputTokens?**: `number`

Defined in: [types/proxy.ts:713](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L713)

---

### outputTokens?

> `optional` **outputTokens?**: `number`

Defined in: [types/proxy.ts:714](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L714)

---

### cacheCreationTokens?

> `optional` **cacheCreationTokens?**: `number`

Defined in: [types/proxy.ts:715](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L715)

---

### cacheReadTokens?

> `optional` **cacheReadTokens?**: `number`

Defined in: [types/proxy.ts:716](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L716)

---

### reasoningTokens?

> `optional` **reasoningTokens?**: `number`

Defined in: [types/proxy.ts:718](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L718)

Reasoning tokens are a subset of output, never additional usage.

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/proxy.ts:724](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L724)

Provider that actually served the request, for costing. Absent on records
written before this field existed; `proxyAnalysis` then falls back to a
cross-provider model lookup rather than assuming Anthropic.

---

### terminalOutcome?

> `optional` **terminalOutcome?**: `"completed"` \| `"bodyless"` \| `"client_cancelled"` \| `"stream_error"` \| `"handler_error"`

Defined in: [types/proxy.ts:726](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L726)

Terminal state of the client-facing response when known.

---

### clientApp?

> `optional` **clientApp?**: `string`

Defined in: [types/proxy.ts:741](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L741)

Which CLI made the request, derived from User-Agent, and the raw header it
was derived from.

Both are stored. The derived name is what a dashboard groups on, but the
classifier only knows the clients it has seen — keeping the raw header
means a client it does not recognise is still attributable rather than
collapsing into "unknown" with everything else.

---

### userAgent?

> `optional` **userAgent?**: `string`

Defined in: [types/proxy.ts:743](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L743)

Raw User-Agent, truncated. See clientApp.

---

### traceId?

> `optional` **traceId?**: `string`

Defined in: [types/proxy.ts:745](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L745)

OTel trace ID for correlation with distributed traces

---

### spanId?

> `optional` **spanId?**: `string`

Defined in: [types/proxy.ts:747](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L747)

OTel span ID for correlation with distributed traces

---

### traceFlags?

> `optional` **traceFlags?**: `number`

Defined in: [types/proxy.ts:749](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L749)

Original OTel sampling flags retained through deferred logging.

---

### routingDecision?

> `optional` **routingDecision?**: [`ProxyAccountRoutingDecision`](ProxyAccountRoutingDecision.md)

Defined in: [types/proxy.ts:751](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L751)

Exact secret-free inputs and result of initial account selection.
