[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RequestLogEntry

# Type Alias: RequestLogEntry

> **RequestLogEntry** = `object`

Defined in: [types/proxy.ts:756](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L756)

## Properties

### servingModelStatus?

> `optional` **servingModelStatus?**: `"observed"` \| `"unavailable"`

Defined in: [types/proxy.ts:758](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L758)

Whether model identifies observed serving output rather than a routing target.

---

### retryable?

> `optional` **retryable?**: `boolean`

Defined in: [types/proxy.ts:760](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L760)

Whether retrying unchanged input can resolve this terminal failure.

---

### tokenBudget?

> `optional` **tokenBudget?**: [`ProxyTokenBudgetSnapshot`](ProxyTokenBudgetSnapshot.md)

Defined in: [types/proxy.ts:761](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L761)

---

### contextPreflight?

> `optional` **contextPreflight?**: [`ProxyContextEvidence`](ProxyContextEvidence.md)

Defined in: [types/proxy.ts:762](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L762)

---

### parentRequestId?

> `optional` **parentRequestId?**: `string`

Defined in: [types/proxy.ts:764](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L764)

Internal adapter requests link to their one client-facing parent.

---

### accountingScope?

> `optional` **accountingScope?**: `"client"` \| `"internal"`

Defined in: [types/proxy.ts:765](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L765)

---

### usageOwnerRequestId?

> `optional` **usageOwnerRequestId?**: `string`

Defined in: [types/proxy.ts:767](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L767)

Exactly this request owns usage; bridge parents never duplicate it.

---

### apiEquivalentCostUsd?

> `optional` **apiEquivalentCostUsd?**: `number` \| `null`

Defined in: [types/proxy.ts:771](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L771)

API price-table estimate, never a subscription charge or quota measure.
Null when complete usage and an exact model rate are not both available.

---

### apiEquivalentCacheSavingsUsd?

> `optional` **apiEquivalentCacheSavingsUsd?**: `number` \| `null`

Defined in: [types/proxy.ts:773](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L773)

API-equivalent cache-read savings against uncached input at the same rate.

---

### pricingStatus?

> `optional` **pricingStatus?**: `"exact"` \| `"inferred"` \| `"unavailable"` \| `"usage_incomplete"` \| `"owned_by_child"`

Defined in: [types/proxy.ts:774](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L774)

---

### pricingBasis?

> `optional` **pricingBasis?**: `"api_price_table"`

Defined in: [types/proxy.ts:780](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L780)

---

### pricingProvider?

> `optional` **pricingProvider?**: `string`

Defined in: [types/proxy.ts:781](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L781)

---

### accountIdentityStatus?

> `optional` **accountIdentityStatus?**: `"observed"` \| `"unavailable"`

Defined in: [types/proxy.ts:784](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L784)

Credential identity is unavailable when the SDK does not expose it.

---

### firstUsefulOutputMs?

> `optional` **firstUsefulOutputMs?**: `number`

Defined in: [types/proxy.ts:786](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L786)

First text, refusal or populated tool output, excluding SSE control frames.

---

### firstUsefulOutputStatus?

> `optional` **firstUsefulOutputStatus?**: `"observed"` \| `"no_useful_output"` \| `"not_observed"`

Defined in: [types/proxy.ts:788](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L788)

Why first-useful-output timing is absent; never substitute a zero.

---

### firstUsefulOutputEvent?

> `optional` **firstUsefulOutputEvent?**: `string`

Defined in: [types/proxy.ts:790](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L790)

Native protocol event that established the first useful output.

---

### firstUsefulOutputUnavailableReason?

> `optional` **firstUsefulOutputUnavailableReason?**: `string`

Defined in: [types/proxy.ts:792](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L792)

Why first-output timing could not be established for this response.

---

### reasoningEffort?

> `optional` **reasoningEffort?**: `string`

Defined in: [types/proxy.ts:794](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L794)

Requested reasoning effort retained independently of body capture.

---

### fallbackPlan?

> `optional` **fallbackPlan?**: `object`[]

Defined in: [types/proxy.ts:796](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L796)

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

Defined in: [types/proxy.ts:801](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L801)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:802](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L802)

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:803](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L803)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:804](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L804)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:805](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L805)

---

### requestedModel?

> `optional` **requestedModel?**: `string`

Defined in: [types/proxy.ts:807](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L807)

Client model when a different upstream model served the request.

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:808](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L808)

---

### toolCount

> **toolCount**: `number`

Defined in: [types/proxy.ts:809](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L809)

---

### account

> **account**: `string`

Defined in: [types/proxy.ts:810](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L810)

---

### accountKey?

> `optional` **accountKey?**: `string`

Defined in: [types/proxy.ts:812](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L812)

Provider-qualified account key for collision-free reconstruction.

---

### accountType

> **accountType**: `string`

Defined in: [types/proxy.ts:813](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L813)

---

### responseStatus

> **responseStatus**: `number`

Defined in: [types/proxy.ts:814](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L814)

---

### responseTimeMs

> **responseTimeMs**: `number`

Defined in: [types/proxy.ts:815](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L815)

---

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:816](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L816)

---

### errorMessage?

> `optional` **errorMessage?**: `string`

Defined in: [types/proxy.ts:817](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L817)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:819](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L819)

Low-level transport code such as ETIMEDOUT or EADDRNOTAVAIL.

---

### transportScope?

> `optional` **transportScope?**: [`ProxyTransportScope`](ProxyTransportScope.md)

Defined in: [types/proxy.ts:821](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L821)

Whether changing credentials can affect this transport failure.

---

### inputIncludesCachedTokens?

> `optional` **inputIncludesCachedTokens?**: `boolean`

Defined in: [types/proxy.ts:823](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L823)

True when input includes the cache breakdown (native Codex wire usage).

---

### inputTokens?

> `optional` **inputTokens?**: `number`

Defined in: [types/proxy.ts:824](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L824)

---

### outputTokens?

> `optional` **outputTokens?**: `number`

Defined in: [types/proxy.ts:825](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L825)

---

### cacheCreationTokens?

> `optional` **cacheCreationTokens?**: `number`

Defined in: [types/proxy.ts:826](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L826)

---

### cacheReadTokens?

> `optional` **cacheReadTokens?**: `number`

Defined in: [types/proxy.ts:827](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L827)

---

### cacheReadTokensObserved?

> `optional` **cacheReadTokensObserved?**: `boolean`

Defined in: [types/proxy.ts:835](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L835)

Whether the provider reported each cache count. Omitted means observed,
so every path that genuinely reports a breakdown is unchanged. When
false the count is absent rather than zero, and the reporting and
pricing paths must not read it as a cache miss: a zero folded into a
hit-rate denominator biases every rate built on these records down.

---

### cacheCreationTokensObserved?

> `optional` **cacheCreationTokensObserved?**: `boolean`

Defined in: [types/proxy.ts:836](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L836)

---

### reasoningTokens?

> `optional` **reasoningTokens?**: `number`

Defined in: [types/proxy.ts:838](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L838)

Reasoning tokens are a subset of output, never additional usage.

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/proxy.ts:844](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L844)

Provider that actually served the request, for costing. Absent on records
written before this field existed; `proxyAnalysis` then falls back to a
cross-provider model lookup rather than assuming Anthropic.

---

### terminalOutcome?

> `optional` **terminalOutcome?**: `"completed"` \| `"bodyless"` \| `"client_cancelled"` \| `"stream_error"` \| `"handler_error"`

Defined in: [types/proxy.ts:846](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L846)

Terminal state of the client-facing response when known.

---

### clientApp?

> `optional` **clientApp?**: `string`

Defined in: [types/proxy.ts:861](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L861)

Which CLI made the request, derived from User-Agent, and the raw header it
was derived from.

Both are stored. The derived name is what a dashboard groups on, but the
classifier only knows the clients it has seen — keeping the raw header
means a client it does not recognise is still attributable rather than
collapsing into "unknown" with everything else.

---

### userAgent?

> `optional` **userAgent?**: `string`

Defined in: [types/proxy.ts:863](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L863)

Raw User-Agent, truncated. See clientApp.

---

### traceId?

> `optional` **traceId?**: `string`

Defined in: [types/proxy.ts:865](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L865)

OTel trace ID for correlation with distributed traces

---

### spanId?

> `optional` **spanId?**: `string`

Defined in: [types/proxy.ts:867](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L867)

OTel span ID for correlation with distributed traces

---

### traceFlags?

> `optional` **traceFlags?**: `number`

Defined in: [types/proxy.ts:869](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L869)

Original OTel sampling flags retained through deferred logging.

---

### routingDecision?

> `optional` **routingDecision?**: [`ProxyAccountRoutingDecision`](ProxyAccountRoutingDecision.md)

Defined in: [types/proxy.ts:871](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L871)

Exact secret-free inputs and result of initial account selection.
