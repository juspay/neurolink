[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicAuthRetryResult

# Type Alias: AnthropicAuthRetryResult

> **AnthropicAuthRetryResult** = `object`

Defined in: [types/proxy.ts:1353](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1353)

## Properties

### response?

> `optional` **response?**: `Response` \| `unknown`

Defined in: [types/proxy.ts:1354](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1354)

---

### holdsAccountAdmission?

> `optional` **holdsAccountAdmission?**: `boolean`

Defined in: [types/proxy.ts:1355](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1355)

---

### continueLoop

> **continueLoop**: `boolean`

Defined in: [types/proxy.ts:1356](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1356)

---

### retryDelayMs?

> `optional` **retryDelayMs?**: `number`

Defined in: [types/proxy.ts:1358](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1358)

Failure-path pacing before rotating after provider-wide overload.

---

### lastError

> **lastError**: `unknown`

Defined in: [types/proxy.ts:1359](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1359)

---

### authFailureMessage

> **authFailureMessage**: `string` \| `null`

Defined in: [types/proxy.ts:1360](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1360)

---

### entitlementFailure

> **entitlementFailure**: [`AnthropicEntitlementFailure`](AnthropicEntitlementFailure.md) \| `null`

Defined in: [types/proxy.ts:1361](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1361)

---

### sawRateLimit

> **sawRateLimit**: `boolean`

Defined in: [types/proxy.ts:1362](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1362)

---

### sawTransientFailure

> **sawTransientFailure**: `boolean`

Defined in: [types/proxy.ts:1363](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1363)

---

### sawNetworkError

> **sawNetworkError**: `boolean`

Defined in: [types/proxy.ts:1364](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1364)

---

### upstreamSpan?

> `optional` **upstreamSpan?**: `Span`

Defined in: [types/proxy.ts:1365](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1365)
