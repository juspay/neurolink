[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RequestLogEntry

# Type Alias: RequestLogEntry

> **RequestLogEntry** = `object`

Defined in: [types/proxy.ts:704](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L704)

## Properties

### servingModelStatus?

> `optional` **servingModelStatus?**: `"observed"` \| `"unavailable"`

Defined in: [types/proxy.ts:706](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L706)

Whether model identifies observed serving output rather than a routing target.

---

### retryable?

> `optional` **retryable?**: `boolean`

Defined in: [types/proxy.ts:708](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L708)

Whether retrying unchanged input can resolve this terminal failure.

---

### tokenBudget?

> `optional` **tokenBudget?**: [`ProxyTokenBudgetSnapshot`](ProxyTokenBudgetSnapshot.md)

Defined in: [types/proxy.ts:709](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L709)

---

### contextPreflight?

> `optional` **contextPreflight?**: [`ProxyContextEvidence`](ProxyContextEvidence.md)

Defined in: [types/proxy.ts:710](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L710)

---

### parentRequestId?

> `optional` **parentRequestId?**: `string`

Defined in: [types/proxy.ts:712](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L712)

Internal adapter requests link to their one client-facing parent.

---

### accountingScope?

> `optional` **accountingScope?**: `"client"` \| `"internal"`

Defined in: [types/proxy.ts:713](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L713)

---

### usageOwnerRequestId?

> `optional` **usageOwnerRequestId?**: `string`

Defined in: [types/proxy.ts:715](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L715)

Exactly this request owns usage; bridge parents never duplicate it.

---

### apiEquivalentCostUsd?

> `optional` **apiEquivalentCostUsd?**: `number` \| `null`

Defined in: [types/proxy.ts:719](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L719)

API price-table estimate, never a subscription charge or quota measure.
Null when complete usage and an exact model rate are not both available.

---

### apiEquivalentCacheSavingsUsd?

> `optional` **apiEquivalentCacheSavingsUsd?**: `number` \| `null`

Defined in: [types/proxy.ts:721](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L721)

API-equivalent cache-read savings against uncached input at the same rate.

---

### pricingStatus?

> `optional` **pricingStatus?**: `"exact"` \| `"inferred"` \| `"unavailable"` \| `"usage_incomplete"` \| `"owned_by_child"`

Defined in: [types/proxy.ts:722](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L722)

---

### pricingBasis?

> `optional` **pricingBasis?**: `"api_price_table"`

Defined in: [types/proxy.ts:728](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L728)

---

### pricingProvider?

> `optional` **pricingProvider?**: `string`

Defined in: [types/proxy.ts:729](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L729)

---

### accountIdentityStatus?

> `optional` **accountIdentityStatus?**: `"observed"` \| `"unavailable"`

Defined in: [types/proxy.ts:732](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L732)

Credential identity is unavailable when the SDK does not expose it.

---

### firstUsefulOutputMs?

> `optional` **firstUsefulOutputMs?**: `number`

Defined in: [types/proxy.ts:734](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L734)

First text, refusal or populated tool output, excluding SSE control frames.

---

### firstUsefulOutputStatus?

> `optional` **firstUsefulOutputStatus?**: `"observed"` \| `"no_useful_output"` \| `"not_observed"`

Defined in: [types/proxy.ts:736](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L736)

Why first-useful-output timing is absent; never substitute a zero.

---

### firstUsefulOutputEvent?

> `optional` **firstUsefulOutputEvent?**: `string`

Defined in: [types/proxy.ts:738](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L738)

Native protocol event that established the first useful output.

---

### firstUsefulOutputUnavailableReason?

> `optional` **firstUsefulOutputUnavailableReason?**: `string`

Defined in: [types/proxy.ts:740](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L740)

Why first-output timing could not be established for this response.

---

### reasoningEffort?

> `optional` **reasoningEffort?**: `string`

Defined in: [types/proxy.ts:742](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L742)

Requested reasoning effort retained independently of body capture.

---

### fallbackPlan?

> `optional` **fallbackPlan?**: `object`[]

Defined in: [types/proxy.ts:744](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L744)

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

Defined in: [types/proxy.ts:749](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L749)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:750](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L750)

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:751](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L751)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:752](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L752)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:753](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L753)

---

### requestedModel?

> `optional` **requestedModel?**: `string`

Defined in: [types/proxy.ts:755](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L755)

Client model when a different upstream model served the request.

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:756](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L756)

---

### toolCount

> **toolCount**: `number`

Defined in: [types/proxy.ts:757](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L757)

---

### account

> **account**: `string`

Defined in: [types/proxy.ts:758](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L758)

---

### accountKey?

> `optional` **accountKey?**: `string`

Defined in: [types/proxy.ts:760](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L760)

Provider-qualified account key for collision-free reconstruction.

---

### accountType

> **accountType**: `string`

Defined in: [types/proxy.ts:761](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L761)

---

### responseStatus

> **responseStatus**: `number`

Defined in: [types/proxy.ts:762](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L762)

---

### responseTimeMs

> **responseTimeMs**: `number`

Defined in: [types/proxy.ts:763](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L763)

---

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:764](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L764)

---

### errorMessage?

> `optional` **errorMessage?**: `string`

Defined in: [types/proxy.ts:765](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L765)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:767](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L767)

Low-level transport code such as ETIMEDOUT or EADDRNOTAVAIL.

---

### transportScope?

> `optional` **transportScope?**: [`ProxyTransportScope`](ProxyTransportScope.md)

Defined in: [types/proxy.ts:769](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L769)

Whether changing credentials can affect this transport failure.

---

### inputIncludesCachedTokens?

> `optional` **inputIncludesCachedTokens?**: `boolean`

Defined in: [types/proxy.ts:771](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L771)

True when input includes the cache breakdown (native Codex wire usage).

---

### inputTokens?

> `optional` **inputTokens?**: `number`

Defined in: [types/proxy.ts:772](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L772)

---

### outputTokens?

> `optional` **outputTokens?**: `number`

Defined in: [types/proxy.ts:773](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L773)

---

### cacheCreationTokens?

> `optional` **cacheCreationTokens?**: `number`

Defined in: [types/proxy.ts:774](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L774)

---

### cacheReadTokens?

> `optional` **cacheReadTokens?**: `number`

Defined in: [types/proxy.ts:775](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L775)

---

### reasoningTokens?

> `optional` **reasoningTokens?**: `number`

Defined in: [types/proxy.ts:777](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L777)

Reasoning tokens are a subset of output, never additional usage.

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/proxy.ts:783](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L783)

Provider that actually served the request, for costing. Absent on records
written before this field existed; `proxyAnalysis` then falls back to a
cross-provider model lookup rather than assuming Anthropic.

---

### terminalOutcome?

> `optional` **terminalOutcome?**: `"completed"` \| `"bodyless"` \| `"client_cancelled"` \| `"stream_error"` \| `"handler_error"`

Defined in: [types/proxy.ts:785](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L785)

Terminal state of the client-facing response when known.

---

### clientApp?

> `optional` **clientApp?**: `string`

Defined in: [types/proxy.ts:800](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L800)

Which CLI made the request, derived from User-Agent, and the raw header it
was derived from.

Both are stored. The derived name is what a dashboard groups on, but the
classifier only knows the clients it has seen — keeping the raw header
means a client it does not recognise is still attributable rather than
collapsing into "unknown" with everything else.

---

### userAgent?

> `optional` **userAgent?**: `string`

Defined in: [types/proxy.ts:802](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L802)

Raw User-Agent, truncated. See clientApp.

---

### traceId?

> `optional` **traceId?**: `string`

Defined in: [types/proxy.ts:804](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L804)

OTel trace ID for correlation with distributed traces

---

### spanId?

> `optional` **spanId?**: `string`

Defined in: [types/proxy.ts:806](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L806)

OTel span ID for correlation with distributed traces

---

### traceFlags?

> `optional` **traceFlags?**: `number`

Defined in: [types/proxy.ts:808](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L808)

Original OTel sampling flags retained through deferred logging.

---

### routingDecision?

> `optional` **routingDecision?**: [`ProxyAccountRoutingDecision`](ProxyAccountRoutingDecision.md)

Defined in: [types/proxy.ts:810](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L810)

Exact secret-free inputs and result of initial account selection.
