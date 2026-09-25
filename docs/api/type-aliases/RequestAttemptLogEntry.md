[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RequestAttemptLogEntry

# Type Alias: RequestAttemptLogEntry

> **RequestAttemptLogEntry** = `object`

Defined in: [types/proxy.ts:1102](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1102)

## Properties

### upstreamDispatched?

> `optional` **upstreamDispatched?**: `boolean`

Defined in: [types/proxy.ts:1104](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1104)

False for a local context/budget refusal before a provider call.

---

### requestedModel?

> `optional` **requestedModel?**: `string`

Defined in: [types/proxy.ts:1106](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1106)

Client model name retained independently of the dispatched model.

---

### tokenBudget?

> `optional` **tokenBudget?**: [`ProxyTokenBudgetSnapshot`](ProxyTokenBudgetSnapshot.md)

Defined in: [types/proxy.ts:1107](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1107)

---

### contextPreflight?

> `optional` **contextPreflight?**: [`ProxyContextEvidence`](ProxyContextEvidence.md)

Defined in: [types/proxy.ts:1108](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1108)

---

### accountingScope?

> `optional` **accountingScope?**: `"client"` \| `"internal"`

Defined in: [types/proxy.ts:1109](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1109)

---

### usageOwnerRequestId?

> `optional` **usageOwnerRequestId?**: `string`

Defined in: [types/proxy.ts:1110](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1110)

---

### timestamp

> **timestamp**: `string`

Defined in: [types/proxy.ts:1111](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1111)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:1112](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1112)

---

### parentRequestId?

> `optional` **parentRequestId?**: `string`

Defined in: [types/proxy.ts:1114](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1114)

Parent client request for an internal fallback invocation.

---

### reasoningEffort?

> `optional` **reasoningEffort?**: `string`

Defined in: [types/proxy.ts:1116](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1116)

Requested effort retained independently of full body captures.

---

### attempt

> **attempt**: `number`

Defined in: [types/proxy.ts:1117](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1117)

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:1118](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1118)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:1119](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1119)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:1120](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1120)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:1121](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1121)

---

### toolCount

> **toolCount**: `number`

Defined in: [types/proxy.ts:1122](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1122)

---

### account

> **account**: `string`

Defined in: [types/proxy.ts:1123](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1123)

---

### accountKey?

> `optional` **accountKey?**: `string`

Defined in: [types/proxy.ts:1125](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1125)

Provider-qualified account key for collision-free reconstruction.

---

### accountType

> **accountType**: `string`

Defined in: [types/proxy.ts:1126](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1126)

---

### responseStatus

> **responseStatus**: `number`

Defined in: [types/proxy.ts:1127](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1127)

---

### responseTimeMs

> **responseTimeMs**: `number`

Defined in: [types/proxy.ts:1129](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1129)

End-to-end request age when this attempt completed.

---

### attemptDurationMs?

> `optional` **attemptDurationMs?**: `number`

Defined in: [types/proxy.ts:1131](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1131)

Time spent in this specific account attempt.

---

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:1132](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1132)

---

### errorMessage?

> `optional` **errorMessage?**: `string`

Defined in: [types/proxy.ts:1133](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1133)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:1135](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1135)

Low-level transport code such as ETIMEDOUT or EADDRNOTAVAIL.

---

### transportScope?

> `optional` **transportScope?**: [`ProxyTransportScope`](ProxyTransportScope.md)

Defined in: [types/proxy.ts:1137](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1137)

Whether changing credentials can affect this transport failure.

---

### retryable?

> `optional` **retryable?**: `boolean`

Defined in: [types/proxy.ts:1139](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1139)

Whether this failed attempt may be retried without changing the request.

---

### connectPhase?

> `optional` **connectPhase?**: `boolean`

Defined in: [types/proxy.ts:1141](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1141)

The transport failure happened before any request byte was sent.

---

### rateLimitKind?

> `optional` **rateLimitKind?**: `"transient"` \| `"quota"`

Defined in: [types/proxy.ts:1143](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1143)

Distinguishes short-lived admission throttles from exhausted quota windows.

---

### cooldownReason?

> `optional` **cooldownReason?**: `"transient"` \| `"session"` \| `"weekly"` \| `"unified"`

Defined in: [types/proxy.ts:1145](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1145)

Reset-aware cooldown reason selected for a rate-limited attempt.

---

### quotaResetAt?

> `optional` **quotaResetAt?**: `number`

Defined in: [types/proxy.ts:1147](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1147)

Reset reported by a structured quota rejection, epoch milliseconds.

---

### quotaScope?

> `optional` **quotaScope?**: `"session"` \| `"weekly"` \| `"unknown"`

Defined in: [types/proxy.ts:1149](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1149)

Unknown scope never implies an account-wide long-window rejection.

---

### inputIncludesCachedTokens?

> `optional` **inputIncludesCachedTokens?**: `boolean`

Defined in: [types/proxy.ts:1151](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1151)

True when input includes the cache breakdown (native Codex wire usage).

---

### inputTokens?

> `optional` **inputTokens?**: `number`

Defined in: [types/proxy.ts:1152](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1152)

---

### outputTokens?

> `optional` **outputTokens?**: `number`

Defined in: [types/proxy.ts:1153](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1153)

---

### cacheCreationTokens?

> `optional` **cacheCreationTokens?**: `number`

Defined in: [types/proxy.ts:1154](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1154)

---

### cacheReadTokens?

> `optional` **cacheReadTokens?**: `number`

Defined in: [types/proxy.ts:1155](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1155)

---

### reasoningTokens?

> `optional` **reasoningTokens?**: `number`

Defined in: [types/proxy.ts:1157](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1157)

Reasoning tokens are a subset of output, never additional usage.

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/proxy.ts:1159](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1159)

Provider that received this upstream attempt.

---

### traceId?

> `optional` **traceId?**: `string`

Defined in: [types/proxy.ts:1161](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1161)

OTel trace ID for correlation with distributed traces

---

### spanId?

> `optional` **spanId?**: `string`

Defined in: [types/proxy.ts:1163](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1163)

OTel span ID for correlation with distributed traces

---

### traceFlags?

> `optional` **traceFlags?**: `number`

Defined in: [types/proxy.ts:1165](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1165)

Original OTel sampling flags retained through deferred logging.
