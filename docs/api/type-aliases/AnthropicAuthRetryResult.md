[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicAuthRetryResult

# Type Alias: AnthropicAuthRetryResult

> **AnthropicAuthRetryResult** = `object`

Defined in: [types/proxy.ts:1199](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1199)

## Properties

### response?

> `optional` **response?**: `Response` \| `unknown`

Defined in: [types/proxy.ts:1200](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1200)

---

### holdsAccountAdmission?

> `optional` **holdsAccountAdmission?**: `boolean`

Defined in: [types/proxy.ts:1201](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1201)

---

### continueLoop

> **continueLoop**: `boolean`

Defined in: [types/proxy.ts:1202](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1202)

---

### retryDelayMs?

> `optional` **retryDelayMs?**: `number`

Defined in: [types/proxy.ts:1204](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1204)

Failure-path pacing before rotating after provider-wide overload.

---

### lastError

> **lastError**: `unknown`

Defined in: [types/proxy.ts:1205](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1205)

---

### authFailureMessage

> **authFailureMessage**: `string` \| `null`

Defined in: [types/proxy.ts:1206](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1206)

---

### entitlementFailure

> **entitlementFailure**: [`AnthropicEntitlementFailure`](AnthropicEntitlementFailure.md) \| `null`

Defined in: [types/proxy.ts:1207](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1207)

---

### sawRateLimit

> **sawRateLimit**: `boolean`

Defined in: [types/proxy.ts:1208](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1208)

---

### sawTransientFailure

> **sawTransientFailure**: `boolean`

Defined in: [types/proxy.ts:1209](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1209)

---

### sawNetworkError

> **sawNetworkError**: `boolean`

Defined in: [types/proxy.ts:1210](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1210)

---

### upstreamSpan?

> `optional` **upstreamSpan?**: `Span`

Defined in: [types/proxy.ts:1211](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1211)
