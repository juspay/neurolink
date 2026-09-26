[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicAuthRetryResult

# Type Alias: AnthropicAuthRetryResult

> **AnthropicAuthRetryResult** = `object`

Defined in: [types/proxy.ts:1420](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1420)

## Properties

### response?

> `optional` **response?**: `Response` \| `unknown`

Defined in: [types/proxy.ts:1421](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1421)

---

### holdsAccountAdmission?

> `optional` **holdsAccountAdmission?**: `boolean`

Defined in: [types/proxy.ts:1422](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1422)

---

### continueLoop

> **continueLoop**: `boolean`

Defined in: [types/proxy.ts:1423](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1423)

---

### retryDelayMs?

> `optional` **retryDelayMs?**: `number`

Defined in: [types/proxy.ts:1425](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1425)

Failure-path pacing before rotating after provider-wide overload.

---

### lastError

> **lastError**: `unknown`

Defined in: [types/proxy.ts:1426](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1426)

---

### authFailureMessage

> **authFailureMessage**: `string` \| `null`

Defined in: [types/proxy.ts:1427](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1427)

---

### entitlementFailure

> **entitlementFailure**: [`AnthropicEntitlementFailure`](AnthropicEntitlementFailure.md) \| `null`

Defined in: [types/proxy.ts:1428](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1428)

---

### sawRateLimit

> **sawRateLimit**: `boolean`

Defined in: [types/proxy.ts:1429](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1429)

---

### sawTransientFailure

> **sawTransientFailure**: `boolean`

Defined in: [types/proxy.ts:1430](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1430)

---

### sawNetworkError

> **sawNetworkError**: `boolean`

Defined in: [types/proxy.ts:1431](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1431)

---

### upstreamSpan?

> `optional` **upstreamSpan?**: `Span`

Defined in: [types/proxy.ts:1432](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1432)
