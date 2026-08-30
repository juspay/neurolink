[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicAuthRetryResult

# Type Alias: AnthropicAuthRetryResult

> **AnthropicAuthRetryResult** = `object`

Defined in: [types/proxy.ts:977](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L977)

## Properties

### response?

> `optional` **response?**: `Response` \| `unknown`

Defined in: [types/proxy.ts:978](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L978)

---

### holdsAccountAdmission?

> `optional` **holdsAccountAdmission?**: `boolean`

Defined in: [types/proxy.ts:979](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L979)

---

### continueLoop

> **continueLoop**: `boolean`

Defined in: [types/proxy.ts:980](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L980)

---

### retryDelayMs?

> `optional` **retryDelayMs?**: `number`

Defined in: [types/proxy.ts:982](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L982)

Failure-path pacing before rotating after provider-wide overload.

---

### lastError

> **lastError**: `unknown`

Defined in: [types/proxy.ts:983](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L983)

---

### authFailureMessage

> **authFailureMessage**: `string` \| `null`

Defined in: [types/proxy.ts:984](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L984)

---

### entitlementFailure

> **entitlementFailure**: [`AnthropicEntitlementFailure`](AnthropicEntitlementFailure.md) \| `null`

Defined in: [types/proxy.ts:985](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L985)

---

### sawRateLimit

> **sawRateLimit**: `boolean`

Defined in: [types/proxy.ts:986](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L986)

---

### sawTransientFailure

> **sawTransientFailure**: `boolean`

Defined in: [types/proxy.ts:987](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L987)

---

### sawNetworkError

> **sawNetworkError**: `boolean`

Defined in: [types/proxy.ts:988](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L988)

---

### upstreamSpan?

> `optional` **upstreamSpan?**: `Span`

Defined in: [types/proxy.ts:989](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L989)
