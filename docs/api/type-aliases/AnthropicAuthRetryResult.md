[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicAuthRetryResult

# Type Alias: AnthropicAuthRetryResult

> **AnthropicAuthRetryResult** = `object`

Defined in: [types/proxy.ts:1078](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1078)

## Properties

### response?

> `optional` **response?**: `Response` \| `unknown`

Defined in: [types/proxy.ts:1079](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1079)

---

### holdsAccountAdmission?

> `optional` **holdsAccountAdmission?**: `boolean`

Defined in: [types/proxy.ts:1080](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1080)

---

### continueLoop

> **continueLoop**: `boolean`

Defined in: [types/proxy.ts:1081](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1081)

---

### retryDelayMs?

> `optional` **retryDelayMs?**: `number`

Defined in: [types/proxy.ts:1083](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1083)

Failure-path pacing before rotating after provider-wide overload.

---

### lastError

> **lastError**: `unknown`

Defined in: [types/proxy.ts:1084](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1084)

---

### authFailureMessage

> **authFailureMessage**: `string` \| `null`

Defined in: [types/proxy.ts:1085](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1085)

---

### entitlementFailure

> **entitlementFailure**: [`AnthropicEntitlementFailure`](AnthropicEntitlementFailure.md) \| `null`

Defined in: [types/proxy.ts:1086](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1086)

---

### sawRateLimit

> **sawRateLimit**: `boolean`

Defined in: [types/proxy.ts:1087](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1087)

---

### sawTransientFailure

> **sawTransientFailure**: `boolean`

Defined in: [types/proxy.ts:1088](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1088)

---

### sawNetworkError

> **sawNetworkError**: `boolean`

Defined in: [types/proxy.ts:1089](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1089)

---

### upstreamSpan?

> `optional` **upstreamSpan?**: `Span`

Defined in: [types/proxy.ts:1090](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1090)
