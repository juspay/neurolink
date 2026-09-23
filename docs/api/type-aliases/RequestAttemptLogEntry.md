[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RequestAttemptLogEntry

# Type Alias: RequestAttemptLogEntry

> **RequestAttemptLogEntry** = `object`

Defined in: [types/proxy.ts:1050](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1050)

## Properties

### upstreamDispatched?

> `optional` **upstreamDispatched?**: `boolean`

Defined in: [types/proxy.ts:1052](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1052)

False for a local context/budget refusal before a provider call.

---

### requestedModel?

> `optional` **requestedModel?**: `string`

Defined in: [types/proxy.ts:1054](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1054)

Client model name retained independently of the dispatched model.

---

### tokenBudget?

> `optional` **tokenBudget?**: [`ProxyTokenBudgetSnapshot`](ProxyTokenBudgetSnapshot.md)

Defined in: [types/proxy.ts:1055](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1055)

---

### contextPreflight?

> `optional` **contextPreflight?**: [`ProxyContextEvidence`](ProxyContextEvidence.md)

Defined in: [types/proxy.ts:1056](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1056)

---

### accountingScope?

> `optional` **accountingScope?**: `"client"` \| `"internal"`

Defined in: [types/proxy.ts:1057](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1057)

---

### usageOwnerRequestId?

> `optional` **usageOwnerRequestId?**: `string`

Defined in: [types/proxy.ts:1058](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1058)

---

### timestamp

> **timestamp**: `string`

Defined in: [types/proxy.ts:1059](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1059)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:1060](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1060)

---

### parentRequestId?

> `optional` **parentRequestId?**: `string`

Defined in: [types/proxy.ts:1062](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1062)

Parent client request for an internal fallback invocation.

---

### reasoningEffort?

> `optional` **reasoningEffort?**: `string`

Defined in: [types/proxy.ts:1064](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1064)

Requested effort retained independently of full body captures.

---

### attempt

> **attempt**: `number`

Defined in: [types/proxy.ts:1065](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1065)

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:1066](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1066)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:1067](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1067)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:1068](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1068)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:1069](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1069)

---

### toolCount

> **toolCount**: `number`

Defined in: [types/proxy.ts:1070](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1070)

---

### account

> **account**: `string`

Defined in: [types/proxy.ts:1071](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1071)

---

### accountKey?

> `optional` **accountKey?**: `string`

Defined in: [types/proxy.ts:1073](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1073)

Provider-qualified account key for collision-free reconstruction.

---

### accountType

> **accountType**: `string`

Defined in: [types/proxy.ts:1074](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1074)

---

### responseStatus

> **responseStatus**: `number`

Defined in: [types/proxy.ts:1075](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1075)

---

### responseTimeMs

> **responseTimeMs**: `number`

Defined in: [types/proxy.ts:1077](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1077)

End-to-end request age when this attempt completed.

---

### attemptDurationMs?

> `optional` **attemptDurationMs?**: `number`

Defined in: [types/proxy.ts:1079](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1079)

Time spent in this specific account attempt.

---

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:1080](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1080)

---

### errorMessage?

> `optional` **errorMessage?**: `string`

Defined in: [types/proxy.ts:1081](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1081)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:1083](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1083)

Low-level transport code such as ETIMEDOUT or EADDRNOTAVAIL.

---

### transportScope?

> `optional` **transportScope?**: [`ProxyTransportScope`](ProxyTransportScope.md)

Defined in: [types/proxy.ts:1085](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1085)

Whether changing credentials can affect this transport failure.

---

### retryable?

> `optional` **retryable?**: `boolean`

Defined in: [types/proxy.ts:1087](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1087)

Whether this failed attempt may be retried without changing the request.

---

### connectPhase?

> `optional` **connectPhase?**: `boolean`

Defined in: [types/proxy.ts:1089](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1089)

The transport failure happened before any request byte was sent.

---

### rateLimitKind?

> `optional` **rateLimitKind?**: `"transient"` \| `"quota"`

Defined in: [types/proxy.ts:1091](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1091)

Distinguishes short-lived admission throttles from exhausted quota windows.

---

### cooldownReason?

> `optional` **cooldownReason?**: `"transient"` \| `"session"` \| `"weekly"` \| `"unified"`

Defined in: [types/proxy.ts:1093](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1093)

Reset-aware cooldown reason selected for a rate-limited attempt.

---

### quotaResetAt?

> `optional` **quotaResetAt?**: `number`

Defined in: [types/proxy.ts:1095](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1095)

Reset reported by a structured quota rejection, epoch milliseconds.

---

### quotaScope?

> `optional` **quotaScope?**: `"session"` \| `"weekly"` \| `"unknown"`

Defined in: [types/proxy.ts:1097](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1097)

Unknown scope never implies an account-wide long-window rejection.

---

### inputIncludesCachedTokens?

> `optional` **inputIncludesCachedTokens?**: `boolean`

Defined in: [types/proxy.ts:1099](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1099)

True when input includes the cache breakdown (native Codex wire usage).

---

### inputTokens?

> `optional` **inputTokens?**: `number`

Defined in: [types/proxy.ts:1100](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1100)

---

### outputTokens?

> `optional` **outputTokens?**: `number`

Defined in: [types/proxy.ts:1101](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1101)

---

### cacheCreationTokens?

> `optional` **cacheCreationTokens?**: `number`

Defined in: [types/proxy.ts:1102](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1102)

---

### cacheReadTokens?

> `optional` **cacheReadTokens?**: `number`

Defined in: [types/proxy.ts:1103](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1103)

---

### reasoningTokens?

> `optional` **reasoningTokens?**: `number`

Defined in: [types/proxy.ts:1105](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1105)

Reasoning tokens are a subset of output, never additional usage.

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/proxy.ts:1107](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1107)

Provider that received this upstream attempt.

---

### traceId?

> `optional` **traceId?**: `string`

Defined in: [types/proxy.ts:1109](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1109)

OTel trace ID for correlation with distributed traces

---

### spanId?

> `optional` **spanId?**: `string`

Defined in: [types/proxy.ts:1111](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1111)

OTel span ID for correlation with distributed traces

---

### traceFlags?

> `optional` **traceFlags?**: `number`

Defined in: [types/proxy.ts:1113](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1113)

Original OTel sampling flags retained through deferred logging.
