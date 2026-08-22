[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / RequestAttemptLogEntry

# Type Alias: RequestAttemptLogEntry

> **RequestAttemptLogEntry** = `object`

Defined in: [types/proxy.ts:712](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L712)

## Properties

### timestamp

> **timestamp**: `string`

Defined in: [types/proxy.ts:713](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L713)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:714](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L714)

---

### attempt

> **attempt**: `number`

Defined in: [types/proxy.ts:715](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L715)

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:716](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L716)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:717](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L717)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:718](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L718)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:719](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L719)

---

### toolCount

> **toolCount**: `number`

Defined in: [types/proxy.ts:720](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L720)

---

### account

> **account**: `string`

Defined in: [types/proxy.ts:721](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L721)

---

### accountType

> **accountType**: `string`

Defined in: [types/proxy.ts:722](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L722)

---

### responseStatus

> **responseStatus**: `number`

Defined in: [types/proxy.ts:723](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L723)

---

### responseTimeMs

> **responseTimeMs**: `number`

Defined in: [types/proxy.ts:725](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L725)

End-to-end request age when this attempt completed.

---

### attemptDurationMs?

> `optional` **attemptDurationMs?**: `number`

Defined in: [types/proxy.ts:727](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L727)

Time spent in this specific account attempt.

---

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:728](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L728)

---

### errorMessage?

> `optional` **errorMessage?**: `string`

Defined in: [types/proxy.ts:729](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L729)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:731](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L731)

Low-level transport code such as ETIMEDOUT or EADDRNOTAVAIL.

---

### transportScope?

> `optional` **transportScope?**: [`ProxyTransportScope`](ProxyTransportScope.md)

Defined in: [types/proxy.ts:733](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L733)

Whether changing credentials can affect this transport failure.

---

### retryable?

> `optional` **retryable?**: `boolean`

Defined in: [types/proxy.ts:735](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L735)

Whether this failed attempt may be retried without changing the request.

---

### rateLimitKind?

> `optional` **rateLimitKind?**: `"transient"` \| `"quota"`

Defined in: [types/proxy.ts:737](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L737)

Distinguishes short-lived admission throttles from exhausted quota windows.

---

### cooldownReason?

> `optional` **cooldownReason?**: `"transient"` \| `"session"` \| `"weekly"` \| `"unified"`

Defined in: [types/proxy.ts:739](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L739)

Reset-aware cooldown reason selected for a rate-limited attempt.

---

### inputTokens?

> `optional` **inputTokens?**: `number`

Defined in: [types/proxy.ts:740](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L740)

---

### outputTokens?

> `optional` **outputTokens?**: `number`

Defined in: [types/proxy.ts:741](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L741)

---

### cacheCreationTokens?

> `optional` **cacheCreationTokens?**: `number`

Defined in: [types/proxy.ts:742](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L742)

---

### cacheReadTokens?

> `optional` **cacheReadTokens?**: `number`

Defined in: [types/proxy.ts:743](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L743)

---

### traceId?

> `optional` **traceId?**: `string`

Defined in: [types/proxy.ts:745](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L745)

OTel trace ID for correlation with distributed traces

---

### spanId?

> `optional` **spanId?**: `string`

Defined in: [types/proxy.ts:747](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L747)

OTel span ID for correlation with distributed traces
