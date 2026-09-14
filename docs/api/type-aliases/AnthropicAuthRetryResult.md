[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicAuthRetryResult

# Type Alias: AnthropicAuthRetryResult

> **AnthropicAuthRetryResult** = `object`

Defined in: [types/proxy.ts:1175](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1175)

## Properties

### response?

> `optional` **response?**: `Response` \| `unknown`

Defined in: [types/proxy.ts:1176](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1176)

---

### holdsAccountAdmission?

> `optional` **holdsAccountAdmission?**: `boolean`

Defined in: [types/proxy.ts:1177](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1177)

---

### continueLoop

> **continueLoop**: `boolean`

Defined in: [types/proxy.ts:1178](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1178)

---

### retryDelayMs?

> `optional` **retryDelayMs?**: `number`

Defined in: [types/proxy.ts:1180](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1180)

Failure-path pacing before rotating after provider-wide overload.

---

### lastError

> **lastError**: `unknown`

Defined in: [types/proxy.ts:1181](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1181)

---

### authFailureMessage

> **authFailureMessage**: `string` \| `null`

Defined in: [types/proxy.ts:1182](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1182)

---

### entitlementFailure

> **entitlementFailure**: [`AnthropicEntitlementFailure`](AnthropicEntitlementFailure.md) \| `null`

Defined in: [types/proxy.ts:1183](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1183)

---

### sawRateLimit

> **sawRateLimit**: `boolean`

Defined in: [types/proxy.ts:1184](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1184)

---

### sawTransientFailure

> **sawTransientFailure**: `boolean`

Defined in: [types/proxy.ts:1185](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1185)

---

### sawNetworkError

> **sawNetworkError**: `boolean`

Defined in: [types/proxy.ts:1186](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1186)

---

### upstreamSpan?

> `optional` **upstreamSpan?**: `Span`

Defined in: [types/proxy.ts:1187](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1187)
