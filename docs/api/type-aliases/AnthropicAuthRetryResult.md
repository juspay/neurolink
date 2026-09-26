[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicAuthRetryResult

# Type Alias: AnthropicAuthRetryResult

> **AnthropicAuthRetryResult** = `object`

Defined in: [types/proxy.ts:1442](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1442)

## Properties

### response?

> `optional` **response?**: `Response` \| `unknown`

Defined in: [types/proxy.ts:1443](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1443)

---

### holdsAccountAdmission?

> `optional` **holdsAccountAdmission?**: `boolean`

Defined in: [types/proxy.ts:1444](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1444)

---

### continueLoop

> **continueLoop**: `boolean`

Defined in: [types/proxy.ts:1445](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1445)

---

### retryDelayMs?

> `optional` **retryDelayMs?**: `number`

Defined in: [types/proxy.ts:1447](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1447)

Failure-path pacing before rotating after provider-wide overload.

---

### lastError

> **lastError**: `unknown`

Defined in: [types/proxy.ts:1448](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1448)

---

### authFailureMessage

> **authFailureMessage**: `string` \| `null`

Defined in: [types/proxy.ts:1449](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1449)

---

### entitlementFailure

> **entitlementFailure**: [`AnthropicEntitlementFailure`](AnthropicEntitlementFailure.md) \| `null`

Defined in: [types/proxy.ts:1450](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1450)

---

### sawRateLimit

> **sawRateLimit**: `boolean`

Defined in: [types/proxy.ts:1451](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1451)

---

### sawTransientFailure

> **sawTransientFailure**: `boolean`

Defined in: [types/proxy.ts:1452](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1452)

---

### sawNetworkError

> **sawNetworkError**: `boolean`

Defined in: [types/proxy.ts:1453](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1453)

---

### upstreamSpan?

> `optional` **upstreamSpan?**: `Span`

Defined in: [types/proxy.ts:1454](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1454)
