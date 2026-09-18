[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RequestAttemptLogEntry

# Type Alias: RequestAttemptLogEntry

> **RequestAttemptLogEntry** = `object`

Defined in: [types/proxy.ts:921](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L921)

## Properties

### timestamp

> **timestamp**: `string`

Defined in: [types/proxy.ts:922](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L922)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:923](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L923)

---

### parentRequestId?

> `optional` **parentRequestId?**: `string`

Defined in: [types/proxy.ts:925](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L925)

Parent client request for an internal fallback invocation.

---

### reasoningEffort?

> `optional` **reasoningEffort?**: `string`

Defined in: [types/proxy.ts:927](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L927)

Requested effort retained independently of full body captures.

---

### attempt

> **attempt**: `number`

Defined in: [types/proxy.ts:928](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L928)

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:929](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L929)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:930](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L930)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:931](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L931)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:932](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L932)

---

### toolCount

> **toolCount**: `number`

Defined in: [types/proxy.ts:933](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L933)

---

### account

> **account**: `string`

Defined in: [types/proxy.ts:934](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L934)

---

### accountKey?

> `optional` **accountKey?**: `string`

Defined in: [types/proxy.ts:936](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L936)

Provider-qualified account key for collision-free reconstruction.

---

### accountType

> **accountType**: `string`

Defined in: [types/proxy.ts:937](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L937)

---

### responseStatus

> **responseStatus**: `number`

Defined in: [types/proxy.ts:938](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L938)

---

### responseTimeMs

> **responseTimeMs**: `number`

Defined in: [types/proxy.ts:940](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L940)

End-to-end request age when this attempt completed.

---

### attemptDurationMs?

> `optional` **attemptDurationMs?**: `number`

Defined in: [types/proxy.ts:942](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L942)

Time spent in this specific account attempt.

---

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:943](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L943)

---

### errorMessage?

> `optional` **errorMessage?**: `string`

Defined in: [types/proxy.ts:944](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L944)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:946](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L946)

Low-level transport code such as ETIMEDOUT or EADDRNOTAVAIL.

---

### transportScope?

> `optional` **transportScope?**: [`ProxyTransportScope`](ProxyTransportScope.md)

Defined in: [types/proxy.ts:948](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L948)

Whether changing credentials can affect this transport failure.

---

### retryable?

> `optional` **retryable?**: `boolean`

Defined in: [types/proxy.ts:950](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L950)

Whether this failed attempt may be retried without changing the request.

---

### connectPhase?

> `optional` **connectPhase?**: `boolean`

Defined in: [types/proxy.ts:952](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L952)

The transport failure happened before any request byte was sent.

---

### rateLimitKind?

> `optional` **rateLimitKind?**: `"transient"` \| `"quota"`

Defined in: [types/proxy.ts:954](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L954)

Distinguishes short-lived admission throttles from exhausted quota windows.

---

### cooldownReason?

> `optional` **cooldownReason?**: `"transient"` \| `"session"` \| `"weekly"` \| `"unified"`

Defined in: [types/proxy.ts:956](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L956)

Reset-aware cooldown reason selected for a rate-limited attempt.

---

### quotaResetAt?

> `optional` **quotaResetAt?**: `number`

Defined in: [types/proxy.ts:958](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L958)

Reset reported by a structured quota rejection, epoch milliseconds.

---

### quotaScope?

> `optional` **quotaScope?**: `"session"` \| `"weekly"` \| `"unknown"`

Defined in: [types/proxy.ts:960](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L960)

Unknown scope never implies an account-wide long-window rejection.

---

### inputTokens?

> `optional` **inputTokens?**: `number`

Defined in: [types/proxy.ts:961](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L961)

---

### outputTokens?

> `optional` **outputTokens?**: `number`

Defined in: [types/proxy.ts:962](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L962)

---

### cacheCreationTokens?

> `optional` **cacheCreationTokens?**: `number`

Defined in: [types/proxy.ts:963](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L963)

---

### cacheReadTokens?

> `optional` **cacheReadTokens?**: `number`

Defined in: [types/proxy.ts:964](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L964)

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/proxy.ts:966](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L966)

Provider that received this upstream attempt.

---

### traceId?

> `optional` **traceId?**: `string`

Defined in: [types/proxy.ts:968](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L968)

OTel trace ID for correlation with distributed traces

---

### spanId?

> `optional` **spanId?**: `string`

Defined in: [types/proxy.ts:970](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L970)

OTel span ID for correlation with distributed traces

---

### traceFlags?

> `optional` **traceFlags?**: `number`

Defined in: [types/proxy.ts:972](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L972)

Original OTel sampling flags retained through deferred logging.
