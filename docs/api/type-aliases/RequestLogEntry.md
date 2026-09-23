[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RequestLogEntry

# Type Alias: RequestLogEntry

> **RequestLogEntry** = `object`

Defined in: [types/proxy.ts:684](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L684)

## Properties

### servingModelStatus?

> `optional` **servingModelStatus?**: `"observed"` \| `"unavailable"`

Defined in: [types/proxy.ts:686](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L686)

Whether model identifies observed serving output rather than a routing target.

---

### retryable?

> `optional` **retryable?**: `boolean`

Defined in: [types/proxy.ts:688](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L688)

Whether retrying unchanged input can resolve this terminal failure.

---

### tokenBudget?

> `optional` **tokenBudget?**: [`ProxyTokenBudgetSnapshot`](ProxyTokenBudgetSnapshot.md)

Defined in: [types/proxy.ts:689](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L689)

---

### contextPreflight?

> `optional` **contextPreflight?**: [`ProxyContextEvidence`](ProxyContextEvidence.md)

Defined in: [types/proxy.ts:690](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L690)

---

### parentRequestId?

> `optional` **parentRequestId?**: `string`

Defined in: [types/proxy.ts:692](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L692)

Internal adapter requests link to their one client-facing parent.

---

### accountingScope?

> `optional` **accountingScope?**: `"client"` \| `"internal"`

Defined in: [types/proxy.ts:693](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L693)

---

### usageOwnerRequestId?

> `optional` **usageOwnerRequestId?**: `string`

Defined in: [types/proxy.ts:695](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L695)

Exactly this request owns usage; bridge parents never duplicate it.

---

### apiEquivalentCostUsd?

> `optional` **apiEquivalentCostUsd?**: `number` \| `null`

Defined in: [types/proxy.ts:699](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L699)

API price-table estimate, never a subscription charge or quota measure.
Null when complete usage and an exact model rate are not both available.

---

### apiEquivalentCacheSavingsUsd?

> `optional` **apiEquivalentCacheSavingsUsd?**: `number` \| `null`

Defined in: [types/proxy.ts:701](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L701)

API-equivalent cache-read savings against uncached input at the same rate.

---

### pricingStatus?

> `optional` **pricingStatus?**: `"exact"` \| `"inferred"` \| `"unavailable"` \| `"usage_incomplete"` \| `"owned_by_child"`

Defined in: [types/proxy.ts:702](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L702)

---

### pricingBasis?

> `optional` **pricingBasis?**: `"api_price_table"`

Defined in: [types/proxy.ts:708](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L708)

---

### pricingProvider?

> `optional` **pricingProvider?**: `string`

Defined in: [types/proxy.ts:709](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L709)

---

### accountIdentityStatus?

> `optional` **accountIdentityStatus?**: `"observed"` \| `"unavailable"`

Defined in: [types/proxy.ts:712](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L712)

Credential identity is unavailable when the SDK does not expose it.

---

### firstUsefulOutputMs?

> `optional` **firstUsefulOutputMs?**: `number`

Defined in: [types/proxy.ts:714](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L714)

First text, refusal or populated tool output, excluding SSE control frames.

---

### firstUsefulOutputStatus?

> `optional` **firstUsefulOutputStatus?**: `"observed"` \| `"no_useful_output"` \| `"not_observed"`

Defined in: [types/proxy.ts:716](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L716)

Why first-useful-output timing is absent; never substitute a zero.

---

### firstUsefulOutputEvent?

> `optional` **firstUsefulOutputEvent?**: `string`

Defined in: [types/proxy.ts:718](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L718)

Native protocol event that established the first useful output.

---

### firstUsefulOutputUnavailableReason?

> `optional` **firstUsefulOutputUnavailableReason?**: `string`

Defined in: [types/proxy.ts:720](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L720)

Why first-output timing could not be established for this response.

---

### reasoningEffort?

> `optional` **reasoningEffort?**: `string`

Defined in: [types/proxy.ts:722](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L722)

Requested reasoning effort retained independently of body capture.

---

### fallbackPlan?

> `optional` **fallbackPlan?**: `object`[]

Defined in: [types/proxy.ts:724](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L724)

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

Defined in: [types/proxy.ts:729](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L729)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:730](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L730)

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:731](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L731)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:732](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L732)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:733](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L733)

---

### requestedModel?

> `optional` **requestedModel?**: `string`

Defined in: [types/proxy.ts:735](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L735)

Client model when a different upstream model served the request.

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:736](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L736)

---

### toolCount

> **toolCount**: `number`

Defined in: [types/proxy.ts:737](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L737)

---

### account

> **account**: `string`

Defined in: [types/proxy.ts:738](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L738)

---

### accountKey?

> `optional` **accountKey?**: `string`

Defined in: [types/proxy.ts:740](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L740)

Provider-qualified account key for collision-free reconstruction.

---

### accountType

> **accountType**: `string`

Defined in: [types/proxy.ts:741](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L741)

---

### responseStatus

> **responseStatus**: `number`

Defined in: [types/proxy.ts:742](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L742)

---

### responseTimeMs

> **responseTimeMs**: `number`

Defined in: [types/proxy.ts:743](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L743)

---

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:744](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L744)

---

### errorMessage?

> `optional` **errorMessage?**: `string`

Defined in: [types/proxy.ts:745](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L745)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:747](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L747)

Low-level transport code such as ETIMEDOUT or EADDRNOTAVAIL.

---

### transportScope?

> `optional` **transportScope?**: [`ProxyTransportScope`](ProxyTransportScope.md)

Defined in: [types/proxy.ts:749](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L749)

Whether changing credentials can affect this transport failure.

---

### inputIncludesCachedTokens?

> `optional` **inputIncludesCachedTokens?**: `boolean`

Defined in: [types/proxy.ts:751](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L751)

True when input includes the cache breakdown (native Codex wire usage).

---

### inputTokens?

> `optional` **inputTokens?**: `number`

Defined in: [types/proxy.ts:752](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L752)

---

### outputTokens?

> `optional` **outputTokens?**: `number`

Defined in: [types/proxy.ts:753](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L753)

---

### cacheCreationTokens?

> `optional` **cacheCreationTokens?**: `number`

Defined in: [types/proxy.ts:754](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L754)

---

### cacheReadTokens?

> `optional` **cacheReadTokens?**: `number`

Defined in: [types/proxy.ts:755](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L755)

---

### reasoningTokens?

> `optional` **reasoningTokens?**: `number`

Defined in: [types/proxy.ts:757](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L757)

Reasoning tokens are a subset of output, never additional usage.

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/proxy.ts:763](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L763)

Provider that actually served the request, for costing. Absent on records
written before this field existed; `proxyAnalysis` then falls back to a
cross-provider model lookup rather than assuming Anthropic.

---

### terminalOutcome?

> `optional` **terminalOutcome?**: `"completed"` \| `"bodyless"` \| `"client_cancelled"` \| `"stream_error"` \| `"handler_error"`

Defined in: [types/proxy.ts:765](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L765)

Terminal state of the client-facing response when known.

---

### clientApp?

> `optional` **clientApp?**: `string`

Defined in: [types/proxy.ts:780](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L780)

Which CLI made the request, derived from User-Agent, and the raw header it
was derived from.

Both are stored. The derived name is what a dashboard groups on, but the
classifier only knows the clients it has seen — keeping the raw header
means a client it does not recognise is still attributable rather than
collapsing into "unknown" with everything else.

---

### userAgent?

> `optional` **userAgent?**: `string`

Defined in: [types/proxy.ts:782](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L782)

Raw User-Agent, truncated. See clientApp.

---

### traceId?

> `optional` **traceId?**: `string`

Defined in: [types/proxy.ts:784](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L784)

OTel trace ID for correlation with distributed traces

---

### spanId?

> `optional` **spanId?**: `string`

Defined in: [types/proxy.ts:786](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L786)

OTel span ID for correlation with distributed traces

---

### traceFlags?

> `optional` **traceFlags?**: `number`

Defined in: [types/proxy.ts:788](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L788)

Original OTel sampling flags retained through deferred logging.

---

### routingDecision?

> `optional` **routingDecision?**: [`ProxyAccountRoutingDecision`](ProxyAccountRoutingDecision.md)

Defined in: [types/proxy.ts:790](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L790)

Exact secret-free inputs and result of initial account selection.
