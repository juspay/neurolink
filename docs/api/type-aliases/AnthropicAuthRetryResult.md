[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicAuthRetryResult

# Type Alias: AnthropicAuthRetryResult

> **AnthropicAuthRetryResult** = `object`

Defined in: [types/proxy.ts:983](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L983)

## Properties

### response?

> `optional` **response?**: `Response` \| `unknown`

Defined in: [types/proxy.ts:984](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L984)

---

### holdsAccountAdmission?

> `optional` **holdsAccountAdmission?**: `boolean`

Defined in: [types/proxy.ts:985](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L985)

---

### continueLoop

> **continueLoop**: `boolean`

Defined in: [types/proxy.ts:986](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L986)

---

### retryDelayMs?

> `optional` **retryDelayMs?**: `number`

Defined in: [types/proxy.ts:988](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L988)

Failure-path pacing before rotating after provider-wide overload.

---

### lastError

> **lastError**: `unknown`

Defined in: [types/proxy.ts:989](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L989)

---

### authFailureMessage

> **authFailureMessage**: `string` \| `null`

Defined in: [types/proxy.ts:990](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L990)

---

### entitlementFailure

> **entitlementFailure**: [`AnthropicEntitlementFailure`](AnthropicEntitlementFailure.md) \| `null`

Defined in: [types/proxy.ts:991](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L991)

---

### sawRateLimit

> **sawRateLimit**: `boolean`

Defined in: [types/proxy.ts:992](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L992)

---

### sawTransientFailure

> **sawTransientFailure**: `boolean`

Defined in: [types/proxy.ts:993](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L993)

---

### sawNetworkError

> **sawNetworkError**: `boolean`

Defined in: [types/proxy.ts:994](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L994)

---

### upstreamSpan?

> `optional` **upstreamSpan?**: `Span`

Defined in: [types/proxy.ts:995](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L995)
