[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicAuthRetryResult

# Type Alias: AnthropicAuthRetryResult

> **AnthropicAuthRetryResult** = `object`

Defined in: [types/proxy.ts:1350](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1350)

## Properties

### response?

> `optional` **response?**: `Response` \| `unknown`

Defined in: [types/proxy.ts:1351](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1351)

---

### holdsAccountAdmission?

> `optional` **holdsAccountAdmission?**: `boolean`

Defined in: [types/proxy.ts:1352](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1352)

---

### continueLoop

> **continueLoop**: `boolean`

Defined in: [types/proxy.ts:1353](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1353)

---

### retryDelayMs?

> `optional` **retryDelayMs?**: `number`

Defined in: [types/proxy.ts:1355](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1355)

Failure-path pacing before rotating after provider-wide overload.

---

### lastError

> **lastError**: `unknown`

Defined in: [types/proxy.ts:1356](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1356)

---

### authFailureMessage

> **authFailureMessage**: `string` \| `null`

Defined in: [types/proxy.ts:1357](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1357)

---

### entitlementFailure

> **entitlementFailure**: [`AnthropicEntitlementFailure`](AnthropicEntitlementFailure.md) \| `null`

Defined in: [types/proxy.ts:1358](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1358)

---

### sawRateLimit

> **sawRateLimit**: `boolean`

Defined in: [types/proxy.ts:1359](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1359)

---

### sawTransientFailure

> **sawTransientFailure**: `boolean`

Defined in: [types/proxy.ts:1360](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1360)

---

### sawNetworkError

> **sawNetworkError**: `boolean`

Defined in: [types/proxy.ts:1361](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1361)

---

### upstreamSpan?

> `optional` **upstreamSpan?**: `Span`

Defined in: [types/proxy.ts:1362](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1362)
