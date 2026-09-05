[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RequestAttemptLogEntry

# Type Alias: RequestAttemptLogEntry

> **RequestAttemptLogEntry** = `object`

Defined in: [types/proxy.ts:729](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L729)

## Properties

### timestamp

> **timestamp**: `string`

Defined in: [types/proxy.ts:730](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L730)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:731](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L731)

---

### attempt

> **attempt**: `number`

Defined in: [types/proxy.ts:732](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L732)

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:733](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L733)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:734](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L734)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:735](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L735)

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

Defined in: [types/proxy.ts:744](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L744)

End-to-end request age when this attempt completed.

---

### attemptDurationMs?

> `optional` **attemptDurationMs?**: `number`

Defined in: [types/proxy.ts:746](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L746)

Time spent in this specific account attempt.

---

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:747](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L747)

---

### errorMessage?

> `optional` **errorMessage?**: `string`

Defined in: [types/proxy.ts:748](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L748)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:750](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L750)

Low-level transport code such as ETIMEDOUT or EADDRNOTAVAIL.

---

### transportScope?

> `optional` **transportScope?**: [`ProxyTransportScope`](ProxyTransportScope.md)

Defined in: [types/proxy.ts:752](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L752)

Whether changing credentials can affect this transport failure.

---

### retryable?

> `optional` **retryable?**: `boolean`

Defined in: [types/proxy.ts:754](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L754)

Whether this failed attempt may be retried without changing the request.

---

### connectPhase?

> `optional` **connectPhase?**: `boolean`

Defined in: [types/proxy.ts:756](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L756)

The transport failure happened before any request byte was sent.

---

### rateLimitKind?

> `optional` **rateLimitKind?**: `"transient"` \| `"quota"`

Defined in: [types/proxy.ts:758](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L758)

Distinguishes short-lived admission throttles from exhausted quota windows.

---

### cooldownReason?

> `optional` **cooldownReason?**: `"transient"` \| `"session"` \| `"weekly"` \| `"unified"`

Defined in: [types/proxy.ts:760](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L760)

Reset-aware cooldown reason selected for a rate-limited attempt.

---

### inputTokens?

> `optional` **inputTokens?**: `number`

Defined in: [types/proxy.ts:761](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L761)

---

### outputTokens?

> `optional` **outputTokens?**: `number`

Defined in: [types/proxy.ts:762](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L762)

---

### cacheCreationTokens?

> `optional` **cacheCreationTokens?**: `number`

Defined in: [types/proxy.ts:763](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L763)

---

### cacheReadTokens?

> `optional` **cacheReadTokens?**: `number`

Defined in: [types/proxy.ts:764](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L764)

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/proxy.ts:766](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L766)

Provider that received this upstream attempt.

---

### traceId?

> `optional` **traceId?**: `string`

Defined in: [types/proxy.ts:768](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L768)

OTel trace ID for correlation with distributed traces

---

### spanId?

> `optional` **spanId?**: `string`

Defined in: [types/proxy.ts:770](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L770)

OTel span ID for correlation with distributed traces
