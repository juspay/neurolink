[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RequestAttemptLogEntry

# Type Alias: RequestAttemptLogEntry

> **RequestAttemptLogEntry** = `object`

Defined in: [types/proxy.ts:814](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L814)

## Properties

### timestamp

> **timestamp**: `string`

Defined in: [types/proxy.ts:815](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L815)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:816](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L816)

---

### parentRequestId?

> `optional` **parentRequestId?**: `string`

Defined in: [types/proxy.ts:818](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L818)

Parent client request for an internal fallback invocation.

---

### reasoningEffort?

> `optional` **reasoningEffort?**: `string`

Defined in: [types/proxy.ts:820](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L820)

Requested effort retained independently of full body captures.

---

### attempt

> **attempt**: `number`

Defined in: [types/proxy.ts:821](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L821)

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:822](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L822)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:823](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L823)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:824](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L824)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:825](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L825)

---

### toolCount

> **toolCount**: `number`

Defined in: [types/proxy.ts:826](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L826)

---

### account

> **account**: `string`

Defined in: [types/proxy.ts:827](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L827)

---

### accountKey?

> `optional` **accountKey?**: `string`

Defined in: [types/proxy.ts:829](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L829)

Provider-qualified account key for collision-free reconstruction.

---

### accountType

> **accountType**: `string`

Defined in: [types/proxy.ts:830](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L830)

---

### responseStatus

> **responseStatus**: `number`

Defined in: [types/proxy.ts:831](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L831)

---

### responseTimeMs

> **responseTimeMs**: `number`

Defined in: [types/proxy.ts:833](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L833)

End-to-end request age when this attempt completed.

---

### attemptDurationMs?

> `optional` **attemptDurationMs?**: `number`

Defined in: [types/proxy.ts:835](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L835)

Time spent in this specific account attempt.

---

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:836](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L836)

---

### errorMessage?

> `optional` **errorMessage?**: `string`

Defined in: [types/proxy.ts:837](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L837)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:839](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L839)

Low-level transport code such as ETIMEDOUT or EADDRNOTAVAIL.

---

### transportScope?

> `optional` **transportScope?**: [`ProxyTransportScope`](ProxyTransportScope.md)

Defined in: [types/proxy.ts:841](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L841)

Whether changing credentials can affect this transport failure.

---

### retryable?

> `optional` **retryable?**: `boolean`

Defined in: [types/proxy.ts:843](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L843)

Whether this failed attempt may be retried without changing the request.

---

### connectPhase?

> `optional` **connectPhase?**: `boolean`

Defined in: [types/proxy.ts:845](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L845)

The transport failure happened before any request byte was sent.

---

### rateLimitKind?

> `optional` **rateLimitKind?**: `"transient"` \| `"quota"`

Defined in: [types/proxy.ts:847](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L847)

Distinguishes short-lived admission throttles from exhausted quota windows.

---

### cooldownReason?

> `optional` **cooldownReason?**: `"transient"` \| `"session"` \| `"weekly"` \| `"unified"`

Defined in: [types/proxy.ts:849](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L849)

Reset-aware cooldown reason selected for a rate-limited attempt.

---

### inputTokens?

> `optional` **inputTokens?**: `number`

Defined in: [types/proxy.ts:850](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L850)

---

### outputTokens?

> `optional` **outputTokens?**: `number`

Defined in: [types/proxy.ts:851](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L851)

---

### cacheCreationTokens?

> `optional` **cacheCreationTokens?**: `number`

Defined in: [types/proxy.ts:852](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L852)

---

### cacheReadTokens?

> `optional` **cacheReadTokens?**: `number`

Defined in: [types/proxy.ts:853](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L853)

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/proxy.ts:855](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L855)

Provider that received this upstream attempt.

---

### traceId?

> `optional` **traceId?**: `string`

Defined in: [types/proxy.ts:857](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L857)

OTel trace ID for correlation with distributed traces

---

### spanId?

> `optional` **spanId?**: `string`

Defined in: [types/proxy.ts:859](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L859)

OTel span ID for correlation with distributed traces
