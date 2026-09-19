[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RequestAttemptLogEntry

# Type Alias: RequestAttemptLogEntry

> **RequestAttemptLogEntry** = `object`

Defined in: [types/proxy.ts:979](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L979)

## Properties

### upstreamDispatched?

> `optional` **upstreamDispatched?**: `boolean`

Defined in: [types/proxy.ts:981](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L981)

False for a local context/budget refusal before a provider call.

---

### requestedModel?

> `optional` **requestedModel?**: `string`

Defined in: [types/proxy.ts:983](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L983)

Client model name retained independently of the dispatched model.

---

### tokenBudget?

> `optional` **tokenBudget?**: [`ProxyTokenBudgetSnapshot`](ProxyTokenBudgetSnapshot.md)

Defined in: [types/proxy.ts:984](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L984)

---

### contextPreflight?

> `optional` **contextPreflight?**: [`ProxyContextEvidence`](ProxyContextEvidence.md)

Defined in: [types/proxy.ts:985](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L985)

---

### accountingScope?

> `optional` **accountingScope?**: `"client"` \| `"internal"`

Defined in: [types/proxy.ts:986](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L986)

---

### usageOwnerRequestId?

> `optional` **usageOwnerRequestId?**: `string`

Defined in: [types/proxy.ts:987](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L987)

---

### timestamp

> **timestamp**: `string`

Defined in: [types/proxy.ts:988](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L988)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:989](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L989)

---

### parentRequestId?

> `optional` **parentRequestId?**: `string`

Defined in: [types/proxy.ts:991](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L991)

Parent client request for an internal fallback invocation.

---

### reasoningEffort?

> `optional` **reasoningEffort?**: `string`

Defined in: [types/proxy.ts:993](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L993)

Requested effort retained independently of full body captures.

---

### attempt

> **attempt**: `number`

Defined in: [types/proxy.ts:994](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L994)

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:995](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L995)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:996](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L996)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:997](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L997)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:998](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L998)

---

### toolCount

> **toolCount**: `number`

Defined in: [types/proxy.ts:999](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L999)

---

### account

> **account**: `string`

Defined in: [types/proxy.ts:1000](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1000)

---

### accountKey?

> `optional` **accountKey?**: `string`

Defined in: [types/proxy.ts:1002](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1002)

Provider-qualified account key for collision-free reconstruction.

---

### accountType

> **accountType**: `string`

Defined in: [types/proxy.ts:1003](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1003)

---

### responseStatus

> **responseStatus**: `number`

Defined in: [types/proxy.ts:1004](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1004)

---

### responseTimeMs

> **responseTimeMs**: `number`

Defined in: [types/proxy.ts:1006](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1006)

End-to-end request age when this attempt completed.

---

### attemptDurationMs?

> `optional` **attemptDurationMs?**: `number`

Defined in: [types/proxy.ts:1008](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1008)

Time spent in this specific account attempt.

---

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:1009](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1009)

---

### errorMessage?

> `optional` **errorMessage?**: `string`

Defined in: [types/proxy.ts:1010](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1010)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:1012](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1012)

Low-level transport code such as ETIMEDOUT or EADDRNOTAVAIL.

---

### transportScope?

> `optional` **transportScope?**: [`ProxyTransportScope`](ProxyTransportScope.md)

Defined in: [types/proxy.ts:1014](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1014)

Whether changing credentials can affect this transport failure.

---

### retryable?

> `optional` **retryable?**: `boolean`

Defined in: [types/proxy.ts:1016](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1016)

Whether this failed attempt may be retried without changing the request.

---

### connectPhase?

> `optional` **connectPhase?**: `boolean`

Defined in: [types/proxy.ts:1018](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1018)

The transport failure happened before any request byte was sent.

---

### rateLimitKind?

> `optional` **rateLimitKind?**: `"transient"` \| `"quota"`

Defined in: [types/proxy.ts:1020](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1020)

Distinguishes short-lived admission throttles from exhausted quota windows.

---

### cooldownReason?

> `optional` **cooldownReason?**: `"transient"` \| `"session"` \| `"weekly"` \| `"unified"`

Defined in: [types/proxy.ts:1022](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1022)

Reset-aware cooldown reason selected for a rate-limited attempt.

---

### quotaResetAt?

> `optional` **quotaResetAt?**: `number`

Defined in: [types/proxy.ts:1024](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1024)

Reset reported by a structured quota rejection, epoch milliseconds.

---

### quotaScope?

> `optional` **quotaScope?**: `"session"` \| `"weekly"` \| `"unknown"`

Defined in: [types/proxy.ts:1026](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1026)

Unknown scope never implies an account-wide long-window rejection.

---

### inputIncludesCachedTokens?

> `optional` **inputIncludesCachedTokens?**: `boolean`

Defined in: [types/proxy.ts:1028](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1028)

True when input includes the cache breakdown (native Codex wire usage).

---

### inputTokens?

> `optional` **inputTokens?**: `number`

Defined in: [types/proxy.ts:1029](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1029)

---

### outputTokens?

> `optional` **outputTokens?**: `number`

Defined in: [types/proxy.ts:1030](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1030)

---

### cacheCreationTokens?

> `optional` **cacheCreationTokens?**: `number`

Defined in: [types/proxy.ts:1031](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1031)

---

### cacheReadTokens?

> `optional` **cacheReadTokens?**: `number`

Defined in: [types/proxy.ts:1032](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1032)

---

### reasoningTokens?

> `optional` **reasoningTokens?**: `number`

Defined in: [types/proxy.ts:1034](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1034)

Reasoning tokens are a subset of output, never additional usage.

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/proxy.ts:1036](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1036)

Provider that received this upstream attempt.

---

### traceId?

> `optional` **traceId?**: `string`

Defined in: [types/proxy.ts:1038](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1038)

OTel trace ID for correlation with distributed traces

---

### spanId?

> `optional` **spanId?**: `string`

Defined in: [types/proxy.ts:1040](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1040)

OTel span ID for correlation with distributed traces

---

### traceFlags?

> `optional` **traceFlags?**: `number`

Defined in: [types/proxy.ts:1042](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1042)

Original OTel sampling flags retained through deferred logging.
