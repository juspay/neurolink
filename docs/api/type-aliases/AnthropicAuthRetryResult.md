[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicAuthRetryResult

# Type Alias: AnthropicAuthRetryResult

> **AnthropicAuthRetryResult** = `object`

Defined in: [types/proxy.ts:920](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L920)

## Properties

### response?

> `optional` **response?**: `Response` \| `unknown`

Defined in: [types/proxy.ts:921](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L921)

---

### holdsAccountAdmission?

> `optional` **holdsAccountAdmission?**: `boolean`

Defined in: [types/proxy.ts:922](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L922)

---

### continueLoop

> **continueLoop**: `boolean`

Defined in: [types/proxy.ts:923](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L923)

---

### retryDelayMs?

> `optional` **retryDelayMs?**: `number`

Defined in: [types/proxy.ts:925](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L925)

Failure-path pacing before rotating after provider-wide overload.

---

### lastError

> **lastError**: `unknown`

Defined in: [types/proxy.ts:926](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L926)

---

### authFailureMessage

> **authFailureMessage**: `string` \| `null`

Defined in: [types/proxy.ts:927](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L927)

---

### entitlementFailure

> **entitlementFailure**: [`AnthropicEntitlementFailure`](AnthropicEntitlementFailure.md) \| `null`

Defined in: [types/proxy.ts:928](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L928)

---

### sawRateLimit

> **sawRateLimit**: `boolean`

Defined in: [types/proxy.ts:929](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L929)

---

### sawTransientFailure

> **sawTransientFailure**: `boolean`

Defined in: [types/proxy.ts:930](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L930)

---

### sawNetworkError

> **sawNetworkError**: `boolean`

Defined in: [types/proxy.ts:931](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L931)

---

### upstreamSpan?

> `optional` **upstreamSpan?**: `Span`

Defined in: [types/proxy.ts:932](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L932)
