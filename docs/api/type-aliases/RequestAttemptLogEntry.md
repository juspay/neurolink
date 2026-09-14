[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RequestAttemptLogEntry

# Type Alias: RequestAttemptLogEntry

> **RequestAttemptLogEntry** = `object`

Defined in: [types/proxy.ts:907](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L907)

## Properties

### timestamp

> **timestamp**: `string`

Defined in: [types/proxy.ts:908](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L908)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:909](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L909)

---

### parentRequestId?

> `optional` **parentRequestId?**: `string`

Defined in: [types/proxy.ts:911](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L911)

Parent client request for an internal fallback invocation.

---

### reasoningEffort?

> `optional` **reasoningEffort?**: `string`

Defined in: [types/proxy.ts:913](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L913)

Requested effort retained independently of full body captures.

---

### attempt

> **attempt**: `number`

Defined in: [types/proxy.ts:914](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L914)

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:915](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L915)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:916](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L916)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:917](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L917)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:918](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L918)

---

### toolCount

> **toolCount**: `number`

Defined in: [types/proxy.ts:919](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L919)

---

### account

> **account**: `string`

Defined in: [types/proxy.ts:920](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L920)

---

### accountKey?

> `optional` **accountKey?**: `string`

Defined in: [types/proxy.ts:922](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L922)

Provider-qualified account key for collision-free reconstruction.

---

### accountType

> **accountType**: `string`

Defined in: [types/proxy.ts:923](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L923)

---

### responseStatus

> **responseStatus**: `number`

Defined in: [types/proxy.ts:924](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L924)

---

### responseTimeMs

> **responseTimeMs**: `number`

Defined in: [types/proxy.ts:926](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L926)

End-to-end request age when this attempt completed.

---

### attemptDurationMs?

> `optional` **attemptDurationMs?**: `number`

Defined in: [types/proxy.ts:928](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L928)

Time spent in this specific account attempt.

---

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:929](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L929)

---

### errorMessage?

> `optional` **errorMessage?**: `string`

Defined in: [types/proxy.ts:930](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L930)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:932](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L932)

Low-level transport code such as ETIMEDOUT or EADDRNOTAVAIL.

---

### transportScope?

> `optional` **transportScope?**: [`ProxyTransportScope`](ProxyTransportScope.md)

Defined in: [types/proxy.ts:934](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L934)

Whether changing credentials can affect this transport failure.

---

### retryable?

> `optional` **retryable?**: `boolean`

Defined in: [types/proxy.ts:936](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L936)

Whether this failed attempt may be retried without changing the request.

---

### connectPhase?

> `optional` **connectPhase?**: `boolean`

Defined in: [types/proxy.ts:938](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L938)

The transport failure happened before any request byte was sent.

---

### rateLimitKind?

> `optional` **rateLimitKind?**: `"transient"` \| `"quota"`

Defined in: [types/proxy.ts:940](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L940)

Distinguishes short-lived admission throttles from exhausted quota windows.

---

### cooldownReason?

> `optional` **cooldownReason?**: `"transient"` \| `"session"` \| `"weekly"` \| `"unified"`

Defined in: [types/proxy.ts:942](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L942)

Reset-aware cooldown reason selected for a rate-limited attempt.

---

### inputTokens?

> `optional` **inputTokens?**: `number`

Defined in: [types/proxy.ts:943](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L943)

---

### outputTokens?

> `optional` **outputTokens?**: `number`

Defined in: [types/proxy.ts:944](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L944)

---

### cacheCreationTokens?

> `optional` **cacheCreationTokens?**: `number`

Defined in: [types/proxy.ts:945](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L945)

---

### cacheReadTokens?

> `optional` **cacheReadTokens?**: `number`

Defined in: [types/proxy.ts:946](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L946)

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/proxy.ts:948](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L948)

Provider that received this upstream attempt.

---

### traceId?

> `optional` **traceId?**: `string`

Defined in: [types/proxy.ts:950](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L950)

OTel trace ID for correlation with distributed traces

---

### spanId?

> `optional` **spanId?**: `string`

Defined in: [types/proxy.ts:952](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L952)

OTel span ID for correlation with distributed traces

---

### traceFlags?

> `optional` **traceFlags?**: `number`

Defined in: [types/proxy.ts:954](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L954)

Original OTel sampling flags retained through deferred logging.
