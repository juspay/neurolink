[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RequestAttemptLogEntry

# Type Alias: RequestAttemptLogEntry

> **RequestAttemptLogEntry** = `object`

Defined in: [types/proxy.ts:912](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L912)

## Properties

### timestamp

> **timestamp**: `string`

Defined in: [types/proxy.ts:913](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L913)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:914](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L914)

---

### parentRequestId?

> `optional` **parentRequestId?**: `string`

Defined in: [types/proxy.ts:916](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L916)

Parent client request for an internal fallback invocation.

---

### reasoningEffort?

> `optional` **reasoningEffort?**: `string`

Defined in: [types/proxy.ts:918](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L918)

Requested effort retained independently of full body captures.

---

### attempt

> **attempt**: `number`

Defined in: [types/proxy.ts:919](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L919)

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:920](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L920)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:921](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L921)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:922](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L922)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:923](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L923)

---

### toolCount

> **toolCount**: `number`

Defined in: [types/proxy.ts:924](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L924)

---

### account

> **account**: `string`

Defined in: [types/proxy.ts:925](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L925)

---

### accountKey?

> `optional` **accountKey?**: `string`

Defined in: [types/proxy.ts:927](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L927)

Provider-qualified account key for collision-free reconstruction.

---

### accountType

> **accountType**: `string`

Defined in: [types/proxy.ts:928](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L928)

---

### responseStatus

> **responseStatus**: `number`

Defined in: [types/proxy.ts:929](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L929)

---

### responseTimeMs

> **responseTimeMs**: `number`

Defined in: [types/proxy.ts:931](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L931)

End-to-end request age when this attempt completed.

---

### attemptDurationMs?

> `optional` **attemptDurationMs?**: `number`

Defined in: [types/proxy.ts:933](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L933)

Time spent in this specific account attempt.

---

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:934](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L934)

---

### errorMessage?

> `optional` **errorMessage?**: `string`

Defined in: [types/proxy.ts:935](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L935)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:937](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L937)

Low-level transport code such as ETIMEDOUT or EADDRNOTAVAIL.

---

### transportScope?

> `optional` **transportScope?**: [`ProxyTransportScope`](ProxyTransportScope.md)

Defined in: [types/proxy.ts:939](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L939)

Whether changing credentials can affect this transport failure.

---

### retryable?

> `optional` **retryable?**: `boolean`

Defined in: [types/proxy.ts:941](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L941)

Whether this failed attempt may be retried without changing the request.

---

### connectPhase?

> `optional` **connectPhase?**: `boolean`

Defined in: [types/proxy.ts:943](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L943)

The transport failure happened before any request byte was sent.

---

### rateLimitKind?

> `optional` **rateLimitKind?**: `"transient"` \| `"quota"`

Defined in: [types/proxy.ts:945](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L945)

Distinguishes short-lived admission throttles from exhausted quota windows.

---

### cooldownReason?

> `optional` **cooldownReason?**: `"transient"` \| `"session"` \| `"weekly"` \| `"unified"`

Defined in: [types/proxy.ts:947](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L947)

Reset-aware cooldown reason selected for a rate-limited attempt.

---

### inputTokens?

> `optional` **inputTokens?**: `number`

Defined in: [types/proxy.ts:948](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L948)

---

### outputTokens?

> `optional` **outputTokens?**: `number`

Defined in: [types/proxy.ts:949](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L949)

---

### cacheCreationTokens?

> `optional` **cacheCreationTokens?**: `number`

Defined in: [types/proxy.ts:950](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L950)

---

### cacheReadTokens?

> `optional` **cacheReadTokens?**: `number`

Defined in: [types/proxy.ts:951](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L951)

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/proxy.ts:953](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L953)

Provider that received this upstream attempt.

---

### traceId?

> `optional` **traceId?**: `string`

Defined in: [types/proxy.ts:955](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L955)

OTel trace ID for correlation with distributed traces

---

### spanId?

> `optional` **spanId?**: `string`

Defined in: [types/proxy.ts:957](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L957)

OTel span ID for correlation with distributed traces

---

### traceFlags?

> `optional` **traceFlags?**: `number`

Defined in: [types/proxy.ts:959](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L959)

Original OTel sampling flags retained through deferred logging.
