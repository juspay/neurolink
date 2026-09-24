[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RequestAttemptLogEntry

# Type Alias: RequestAttemptLogEntry

> **RequestAttemptLogEntry** = `object`

Defined in: [types/proxy.ts:1111](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1111)

## Properties

### upstreamDispatched?

> `optional` **upstreamDispatched?**: `boolean`

Defined in: [types/proxy.ts:1113](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1113)

False for a local context/budget refusal before a provider call.

---

### requestedModel?

> `optional` **requestedModel?**: `string`

Defined in: [types/proxy.ts:1115](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1115)

Client model name retained independently of the dispatched model.

---

### tokenBudget?

> `optional` **tokenBudget?**: [`ProxyTokenBudgetSnapshot`](ProxyTokenBudgetSnapshot.md)

Defined in: [types/proxy.ts:1116](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1116)

---

### contextPreflight?

> `optional` **contextPreflight?**: [`ProxyContextEvidence`](ProxyContextEvidence.md)

Defined in: [types/proxy.ts:1117](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1117)

---

### accountingScope?

> `optional` **accountingScope?**: `"client"` \| `"internal"`

Defined in: [types/proxy.ts:1118](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1118)

---

### usageOwnerRequestId?

> `optional` **usageOwnerRequestId?**: `string`

Defined in: [types/proxy.ts:1119](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1119)

---

### timestamp

> **timestamp**: `string`

Defined in: [types/proxy.ts:1120](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1120)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:1121](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1121)

---

### parentRequestId?

> `optional` **parentRequestId?**: `string`

Defined in: [types/proxy.ts:1123](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1123)

Parent client request for an internal fallback invocation.

---

### reasoningEffort?

> `optional` **reasoningEffort?**: `string`

Defined in: [types/proxy.ts:1125](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1125)

Requested effort retained independently of full body captures.

---

### attempt

> **attempt**: `number`

Defined in: [types/proxy.ts:1126](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1126)

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:1127](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1127)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:1128](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1128)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:1129](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1129)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:1130](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1130)

---

### toolCount

> **toolCount**: `number`

Defined in: [types/proxy.ts:1131](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1131)

---

### account

> **account**: `string`

Defined in: [types/proxy.ts:1132](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1132)

---

### accountKey?

> `optional` **accountKey?**: `string`

Defined in: [types/proxy.ts:1134](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1134)

Provider-qualified account key for collision-free reconstruction.

---

### accountType

> **accountType**: `string`

Defined in: [types/proxy.ts:1135](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1135)

---

### responseStatus

> **responseStatus**: `number`

Defined in: [types/proxy.ts:1136](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1136)

---

### responseTimeMs

> **responseTimeMs**: `number`

Defined in: [types/proxy.ts:1138](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1138)

End-to-end request age when this attempt completed.

---

### attemptDurationMs?

> `optional` **attemptDurationMs?**: `number`

Defined in: [types/proxy.ts:1140](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1140)

Time spent in this specific account attempt.

---

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:1141](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1141)

---

### errorMessage?

> `optional` **errorMessage?**: `string`

Defined in: [types/proxy.ts:1142](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1142)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:1144](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1144)

Low-level transport code such as ETIMEDOUT or EADDRNOTAVAIL.

---

### transportScope?

> `optional` **transportScope?**: [`ProxyTransportScope`](ProxyTransportScope.md)

Defined in: [types/proxy.ts:1146](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1146)

Whether changing credentials can affect this transport failure.

---

### retryable?

> `optional` **retryable?**: `boolean`

Defined in: [types/proxy.ts:1148](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1148)

Whether this failed attempt may be retried without changing the request.

---

### connectPhase?

> `optional` **connectPhase?**: `boolean`

Defined in: [types/proxy.ts:1150](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1150)

The transport failure happened before any request byte was sent.

---

### rateLimitKind?

> `optional` **rateLimitKind?**: `"transient"` \| `"quota"`

Defined in: [types/proxy.ts:1152](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1152)

Distinguishes short-lived admission throttles from exhausted quota windows.

---

### cooldownReason?

> `optional` **cooldownReason?**: `"transient"` \| `"session"` \| `"weekly"` \| `"unified"`

Defined in: [types/proxy.ts:1154](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1154)

Reset-aware cooldown reason selected for a rate-limited attempt.

---

### quotaResetAt?

> `optional` **quotaResetAt?**: `number`

Defined in: [types/proxy.ts:1156](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1156)

Reset reported by a structured quota rejection, epoch milliseconds.

---

### quotaScope?

> `optional` **quotaScope?**: `"session"` \| `"weekly"` \| `"unknown"`

Defined in: [types/proxy.ts:1158](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1158)

Unknown scope never implies an account-wide long-window rejection.

---

### inputIncludesCachedTokens?

> `optional` **inputIncludesCachedTokens?**: `boolean`

Defined in: [types/proxy.ts:1160](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1160)

True when input includes the cache breakdown (native Codex wire usage).

---

### inputTokens?

> `optional` **inputTokens?**: `number`

Defined in: [types/proxy.ts:1161](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1161)

---

### outputTokens?

> `optional` **outputTokens?**: `number`

Defined in: [types/proxy.ts:1162](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1162)

---

### cacheCreationTokens?

> `optional` **cacheCreationTokens?**: `number`

Defined in: [types/proxy.ts:1163](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1163)

---

### cacheReadTokens?

> `optional` **cacheReadTokens?**: `number`

Defined in: [types/proxy.ts:1164](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1164)

---

### reasoningTokens?

> `optional` **reasoningTokens?**: `number`

Defined in: [types/proxy.ts:1166](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1166)

Reasoning tokens are a subset of output, never additional usage.

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/proxy.ts:1168](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1168)

Provider that received this upstream attempt.

---

### traceId?

> `optional` **traceId?**: `string`

Defined in: [types/proxy.ts:1170](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1170)

OTel trace ID for correlation with distributed traces

---

### spanId?

> `optional` **spanId?**: `string`

Defined in: [types/proxy.ts:1172](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1172)

OTel span ID for correlation with distributed traces

---

### traceFlags?

> `optional` **traceFlags?**: `number`

Defined in: [types/proxy.ts:1174](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1174)

Original OTel sampling flags retained through deferred logging.
