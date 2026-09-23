[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RequestAttemptLogEntry

# Type Alias: RequestAttemptLogEntry

> **RequestAttemptLogEntry** = `object`

Defined in: [types/proxy.ts:1030](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1030)

## Properties

### upstreamDispatched?

> `optional` **upstreamDispatched?**: `boolean`

Defined in: [types/proxy.ts:1032](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1032)

False for a local context/budget refusal before a provider call.

---

### requestedModel?

> `optional` **requestedModel?**: `string`

Defined in: [types/proxy.ts:1034](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1034)

Client model name retained independently of the dispatched model.

---

### tokenBudget?

> `optional` **tokenBudget?**: [`ProxyTokenBudgetSnapshot`](ProxyTokenBudgetSnapshot.md)

Defined in: [types/proxy.ts:1035](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1035)

---

### contextPreflight?

> `optional` **contextPreflight?**: [`ProxyContextEvidence`](ProxyContextEvidence.md)

Defined in: [types/proxy.ts:1036](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1036)

---

### accountingScope?

> `optional` **accountingScope?**: `"client"` \| `"internal"`

Defined in: [types/proxy.ts:1037](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1037)

---

### usageOwnerRequestId?

> `optional` **usageOwnerRequestId?**: `string`

Defined in: [types/proxy.ts:1038](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1038)

---

### timestamp

> **timestamp**: `string`

Defined in: [types/proxy.ts:1039](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1039)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:1040](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1040)

---

### parentRequestId?

> `optional` **parentRequestId?**: `string`

Defined in: [types/proxy.ts:1042](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1042)

Parent client request for an internal fallback invocation.

---

### reasoningEffort?

> `optional` **reasoningEffort?**: `string`

Defined in: [types/proxy.ts:1044](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1044)

Requested effort retained independently of full body captures.

---

### attempt

> **attempt**: `number`

Defined in: [types/proxy.ts:1045](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1045)

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:1046](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1046)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:1047](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1047)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:1048](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1048)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:1049](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1049)

---

### toolCount

> **toolCount**: `number`

Defined in: [types/proxy.ts:1050](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1050)

---

### account

> **account**: `string`

Defined in: [types/proxy.ts:1051](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1051)

---

### accountKey?

> `optional` **accountKey?**: `string`

Defined in: [types/proxy.ts:1053](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1053)

Provider-qualified account key for collision-free reconstruction.

---

### accountType

> **accountType**: `string`

Defined in: [types/proxy.ts:1054](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1054)

---

### responseStatus

> **responseStatus**: `number`

Defined in: [types/proxy.ts:1055](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1055)

---

### responseTimeMs

> **responseTimeMs**: `number`

Defined in: [types/proxy.ts:1057](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1057)

End-to-end request age when this attempt completed.

---

### attemptDurationMs?

> `optional` **attemptDurationMs?**: `number`

Defined in: [types/proxy.ts:1059](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1059)

Time spent in this specific account attempt.

---

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:1060](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1060)

---

### errorMessage?

> `optional` **errorMessage?**: `string`

Defined in: [types/proxy.ts:1061](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1061)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:1063](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1063)

Low-level transport code such as ETIMEDOUT or EADDRNOTAVAIL.

---

### transportScope?

> `optional` **transportScope?**: [`ProxyTransportScope`](ProxyTransportScope.md)

Defined in: [types/proxy.ts:1065](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1065)

Whether changing credentials can affect this transport failure.

---

### retryable?

> `optional` **retryable?**: `boolean`

Defined in: [types/proxy.ts:1067](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1067)

Whether this failed attempt may be retried without changing the request.

---

### connectPhase?

> `optional` **connectPhase?**: `boolean`

Defined in: [types/proxy.ts:1069](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1069)

The transport failure happened before any request byte was sent.

---

### rateLimitKind?

> `optional` **rateLimitKind?**: `"transient"` \| `"quota"`

Defined in: [types/proxy.ts:1071](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1071)

Distinguishes short-lived admission throttles from exhausted quota windows.

---

### cooldownReason?

> `optional` **cooldownReason?**: `"transient"` \| `"session"` \| `"weekly"` \| `"unified"`

Defined in: [types/proxy.ts:1073](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1073)

Reset-aware cooldown reason selected for a rate-limited attempt.

---

### quotaResetAt?

> `optional` **quotaResetAt?**: `number`

Defined in: [types/proxy.ts:1075](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1075)

Reset reported by a structured quota rejection, epoch milliseconds.

---

### quotaScope?

> `optional` **quotaScope?**: `"session"` \| `"weekly"` \| `"unknown"`

Defined in: [types/proxy.ts:1077](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1077)

Unknown scope never implies an account-wide long-window rejection.

---

### inputIncludesCachedTokens?

> `optional` **inputIncludesCachedTokens?**: `boolean`

Defined in: [types/proxy.ts:1079](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1079)

True when input includes the cache breakdown (native Codex wire usage).

---

### inputTokens?

> `optional` **inputTokens?**: `number`

Defined in: [types/proxy.ts:1080](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1080)

---

### outputTokens?

> `optional` **outputTokens?**: `number`

Defined in: [types/proxy.ts:1081](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1081)

---

### cacheCreationTokens?

> `optional` **cacheCreationTokens?**: `number`

Defined in: [types/proxy.ts:1082](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1082)

---

### cacheReadTokens?

> `optional` **cacheReadTokens?**: `number`

Defined in: [types/proxy.ts:1083](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1083)

---

### reasoningTokens?

> `optional` **reasoningTokens?**: `number`

Defined in: [types/proxy.ts:1085](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1085)

Reasoning tokens are a subset of output, never additional usage.

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/proxy.ts:1087](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1087)

Provider that received this upstream attempt.

---

### traceId?

> `optional` **traceId?**: `string`

Defined in: [types/proxy.ts:1089](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1089)

OTel trace ID for correlation with distributed traces

---

### spanId?

> `optional` **spanId?**: `string`

Defined in: [types/proxy.ts:1091](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1091)

OTel span ID for correlation with distributed traces

---

### traceFlags?

> `optional` **traceFlags?**: `number`

Defined in: [types/proxy.ts:1093](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1093)

Original OTel sampling flags retained through deferred logging.
