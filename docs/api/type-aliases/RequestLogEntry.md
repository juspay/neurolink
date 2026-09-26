[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RequestLogEntry

# Type Alias: RequestLogEntry

> **RequestLogEntry** = `object`

## Properties

### servingModelStatus?

> `optional` **servingModelStatus?**: `"observed"` \| `"unavailable"`

Whether model identifies observed serving output rather than a routing target.

---

### retryable?

> `optional` **retryable?**: `boolean`

Whether retrying unchanged input can resolve this terminal failure.

---

### tokenBudget?

> `optional` **tokenBudget?**: [`ProxyTokenBudgetSnapshot`](ProxyTokenBudgetSnapshot.md)

---

### contextPreflight?

> `optional` **contextPreflight?**: [`ProxyContextEvidence`](ProxyContextEvidence.md)

---

### parentRequestId?

> `optional` **parentRequestId?**: `string`

Internal adapter requests link to their one client-facing parent.

---

### accountingScope?

> `optional` **accountingScope?**: `"client"` \| `"internal"`

---

### usageOwnerRequestId?

> `optional` **usageOwnerRequestId?**: `string`

Exactly this request owns usage; bridge parents never duplicate it.

---

### apiEquivalentCostUsd?

> `optional` **apiEquivalentCostUsd?**: `number` \| `null`

API price-table estimate, never a subscription charge or quota measure.
Null when complete usage and an exact model rate are not both available.

---

### apiEquivalentCacheSavingsUsd?

> `optional` **apiEquivalentCacheSavingsUsd?**: `number` \| `null`

API-equivalent cache-read savings against uncached input at the same rate.

---

### pricingStatus?

> `optional` **pricingStatus?**: `"exact"` \| `"inferred"` \| `"unavailable"` \| `"usage_incomplete"` \| `"owned_by_child"`

---

### pricingBasis?

> `optional` **pricingBasis?**: `"api_price_table"`

---

### pricingProvider?

> `optional` **pricingProvider?**: `string`

---

### accountIdentityStatus?

> `optional` **accountIdentityStatus?**: `"observed"` \| `"unavailable"`

Credential identity is unavailable when the SDK does not expose it.

---

### firstUsefulOutputMs?

> `optional` **firstUsefulOutputMs?**: `number`

First text, refusal or populated tool output, excluding SSE control frames.

---

### firstUsefulOutputStatus?

> `optional` **firstUsefulOutputStatus?**: `"observed"` \| `"no_useful_output"` \| `"not_observed"`

Why first-useful-output timing is absent; never substitute a zero.

---

### firstUsefulOutputEvent?

> `optional` **firstUsefulOutputEvent?**: `string`

Native protocol event that established the first useful output.

---

### firstUsefulOutputUnavailableReason?

> `optional` **firstUsefulOutputUnavailableReason?**: `string`

Why first-output timing could not be established for this response.

---

### reasoningEffort?

> `optional` **reasoningEffort?**: `string`

Requested reasoning effort retained independently of body capture.

---

### fallbackPlan?

> `optional` **fallbackPlan?**: `object`[]

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

---

### requestId

> **requestId**: `string`

---

### method

> **method**: `string`

---

### path

> **path**: `string`

---

### model

> **model**: `string`

---

### requestedModel?

> `optional` **requestedModel?**: `string`

Client model when a different upstream model served the request.

---

### stream

> **stream**: `boolean`

---

### toolCount

> **toolCount**: `number`

---

### account

> **account**: `string`

---

### accountKey?

> `optional` **accountKey?**: `string`

Provider-qualified account key for collision-free reconstruction.

---

### accountType

> **accountType**: `string`

---

### responseStatus

> **responseStatus**: `number`

---

### responseTimeMs

> **responseTimeMs**: `number`

---

### errorType?

> `optional` **errorType?**: `string`

---

### errorMessage?

> `optional` **errorMessage?**: `string`

---

### errorCode?

> `optional` **errorCode?**: `string`

Low-level transport code such as ETIMEDOUT or EADDRNOTAVAIL.

---

### transportScope?

> `optional` **transportScope?**: [`ProxyTransportScope`](ProxyTransportScope.md)

Whether changing credentials can affect this transport failure.

---

### inputIncludesCachedTokens?

> `optional` **inputIncludesCachedTokens?**: `boolean`

True when input includes the cache breakdown (native Codex wire usage).

---

### inputTokens?

> `optional` **inputTokens?**: `number`

---

### outputTokens?

> `optional` **outputTokens?**: `number`

---

### cacheCreationTokens?

> `optional` **cacheCreationTokens?**: `number`

---

### cacheReadTokens?

> `optional` **cacheReadTokens?**: `number`

---

### cacheReadTokensObserved?

> `optional` **cacheReadTokensObserved?**: `boolean`

Whether the provider reported each cache count. Omitted means observed,
so every path that genuinely reports a breakdown is unchanged. When
false the count is absent rather than zero, and the reporting and
pricing paths must not read it as a cache miss: a zero folded into a
hit-rate denominator biases every rate built on these records down.

---

### cacheCreationTokensObserved?

> `optional` **cacheCreationTokensObserved?**: `boolean`

---

### reasoningTokens?

> `optional` **reasoningTokens?**: `number`

Reasoning tokens are a subset of output, never additional usage.

---

### provider?

> `optional` **provider?**: `string`

Provider that actually served the request, for costing. Absent on records
written before this field existed; `proxyAnalysis` then falls back to a
cross-provider model lookup rather than assuming Anthropic.

---

### terminalOutcome?

> `optional` **terminalOutcome?**: `"completed"` \| `"bodyless"` \| `"client_cancelled"` \| `"stream_error"` \| `"handler_error"`

Terminal state of the client-facing response when known.

---

### clientApp?

> `optional` **clientApp?**: `string`

Which CLI made the request, derived from User-Agent, and the raw header it
was derived from.

Both are stored. The derived name is what a dashboard groups on, but the
classifier only knows the clients it has seen — keeping the raw header
means a client it does not recognise is still attributable rather than
collapsing into "unknown" with everything else.

---

### userAgent?

> `optional` **userAgent?**: `string`

Raw User-Agent, truncated. See clientApp.

---

### traceId?

> `optional` **traceId?**: `string`

OTel trace ID for correlation with distributed traces

---

### spanId?

> `optional` **spanId?**: `string`

OTel span ID for correlation with distributed traces

---

### traceFlags?

> `optional` **traceFlags?**: `number`

Original OTel sampling flags retained through deferred logging.

---

### routingDecision?

> `optional` **routingDecision?**: [`ProxyAccountRoutingDecision`](ProxyAccountRoutingDecision.md)

Exact secret-free inputs and result of initial account selection.
