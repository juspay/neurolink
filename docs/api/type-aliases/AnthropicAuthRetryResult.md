[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicAuthRetryResult

# Type Alias: AnthropicAuthRetryResult

> **AnthropicAuthRetryResult** = `object`

Defined in: [types/proxy.ts:988](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L988)

## Properties

### response?

> `optional` **response?**: `Response` \| `unknown`

Defined in: [types/proxy.ts:989](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L989)

---

### holdsAccountAdmission?

> `optional` **holdsAccountAdmission?**: `boolean`

Defined in: [types/proxy.ts:990](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L990)

---

### continueLoop

> **continueLoop**: `boolean`

Defined in: [types/proxy.ts:991](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L991)

---

### retryDelayMs?

> `optional` **retryDelayMs?**: `number`

Defined in: [types/proxy.ts:993](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L993)

Failure-path pacing before rotating after provider-wide overload.

---

### lastError

> **lastError**: `unknown`

Defined in: [types/proxy.ts:994](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L994)

---

### authFailureMessage

> **authFailureMessage**: `string` \| `null`

Defined in: [types/proxy.ts:995](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L995)

---

### entitlementFailure

> **entitlementFailure**: [`AnthropicEntitlementFailure`](AnthropicEntitlementFailure.md) \| `null`

Defined in: [types/proxy.ts:996](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L996)

---

### sawRateLimit

> **sawRateLimit**: `boolean`

Defined in: [types/proxy.ts:997](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L997)

---

### sawTransientFailure

> **sawTransientFailure**: `boolean`

Defined in: [types/proxy.ts:998](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L998)

---

### sawNetworkError

> **sawNetworkError**: `boolean`

Defined in: [types/proxy.ts:999](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L999)

---

### upstreamSpan?

> `optional` **upstreamSpan?**: `Span`

Defined in: [types/proxy.ts:1000](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1000)
