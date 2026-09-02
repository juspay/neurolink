[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RequestAttemptLogEntry

# Type Alias: RequestAttemptLogEntry

> **RequestAttemptLogEntry** = `object`

Defined in: [types/proxy.ts:724](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L724)

## Properties

### timestamp

> **timestamp**: `string`

Defined in: [types/proxy.ts:725](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L725)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:726](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L726)

---

### attempt

> **attempt**: `number`

Defined in: [types/proxy.ts:727](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L727)

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:728](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L728)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:729](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L729)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:730](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L730)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:731](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L731)

---

### toolCount

> **toolCount**: `number`

Defined in: [types/proxy.ts:732](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L732)

---

### account

> **account**: `string`

Defined in: [types/proxy.ts:733](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L733)

---

### accountKey?

> `optional` **accountKey?**: `string`

Defined in: [types/proxy.ts:735](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L735)

Provider-qualified account key for collision-free reconstruction.

---

### accountType

> **accountType**: `string`

Defined in: [types/proxy.ts:736](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L736)

---

### responseStatus

> **responseStatus**: `number`

Defined in: [types/proxy.ts:737](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L737)

---

### responseTimeMs

> **responseTimeMs**: `number`

Defined in: [types/proxy.ts:739](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L739)

End-to-end request age when this attempt completed.

---

### attemptDurationMs?

> `optional` **attemptDurationMs?**: `number`

Defined in: [types/proxy.ts:741](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L741)

Time spent in this specific account attempt.

---

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:742](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L742)

---

### errorMessage?

> `optional` **errorMessage?**: `string`

Defined in: [types/proxy.ts:743](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L743)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:745](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L745)

Low-level transport code such as ETIMEDOUT or EADDRNOTAVAIL.

---

### transportScope?

> `optional` **transportScope?**: [`ProxyTransportScope`](ProxyTransportScope.md)

Defined in: [types/proxy.ts:747](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L747)

Whether changing credentials can affect this transport failure.

---

### retryable?

> `optional` **retryable?**: `boolean`

Defined in: [types/proxy.ts:749](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L749)

Whether this failed attempt may be retried without changing the request.

---

### connectPhase?

> `optional` **connectPhase?**: `boolean`

Defined in: [types/proxy.ts:751](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L751)

The transport failure happened before any request byte was sent.

---

### rateLimitKind?

> `optional` **rateLimitKind?**: `"transient"` \| `"quota"`

Defined in: [types/proxy.ts:753](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L753)

Distinguishes short-lived admission throttles from exhausted quota windows.

---

### cooldownReason?

> `optional` **cooldownReason?**: `"transient"` \| `"session"` \| `"weekly"` \| `"unified"`

Defined in: [types/proxy.ts:755](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L755)

Reset-aware cooldown reason selected for a rate-limited attempt.

---

### inputTokens?

> `optional` **inputTokens?**: `number`

Defined in: [types/proxy.ts:756](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L756)

---

### outputTokens?

> `optional` **outputTokens?**: `number`

Defined in: [types/proxy.ts:757](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L757)

---

### cacheCreationTokens?

> `optional` **cacheCreationTokens?**: `number`

Defined in: [types/proxy.ts:758](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L758)

---

### cacheReadTokens?

> `optional` **cacheReadTokens?**: `number`

Defined in: [types/proxy.ts:759](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L759)

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/proxy.ts:761](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L761)

Provider that received this upstream attempt.

---

### traceId?

> `optional` **traceId?**: `string`

Defined in: [types/proxy.ts:763](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L763)

OTel trace ID for correlation with distributed traces

---

### spanId?

> `optional` **spanId?**: `string`

Defined in: [types/proxy.ts:765](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L765)

OTel span ID for correlation with distributed traces
