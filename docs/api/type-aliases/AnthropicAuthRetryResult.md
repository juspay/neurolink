[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicAuthRetryResult

# Type Alias: AnthropicAuthRetryResult

> **AnthropicAuthRetryResult** = `object`

Defined in: [types/proxy.ts:1279](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1279)

## Properties

### response?

> `optional` **response?**: `Response` \| `unknown`

Defined in: [types/proxy.ts:1280](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1280)

---

### holdsAccountAdmission?

> `optional` **holdsAccountAdmission?**: `boolean`

Defined in: [types/proxy.ts:1281](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1281)

---

### continueLoop

> **continueLoop**: `boolean`

Defined in: [types/proxy.ts:1282](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1282)

---

### retryDelayMs?

> `optional` **retryDelayMs?**: `number`

Defined in: [types/proxy.ts:1284](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1284)

Failure-path pacing before rotating after provider-wide overload.

---

### lastError

> **lastError**: `unknown`

Defined in: [types/proxy.ts:1285](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1285)

---

### authFailureMessage

> **authFailureMessage**: `string` \| `null`

Defined in: [types/proxy.ts:1286](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1286)

---

### entitlementFailure

> **entitlementFailure**: [`AnthropicEntitlementFailure`](AnthropicEntitlementFailure.md) \| `null`

Defined in: [types/proxy.ts:1287](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1287)

---

### sawRateLimit

> **sawRateLimit**: `boolean`

Defined in: [types/proxy.ts:1288](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1288)

---

### sawTransientFailure

> **sawTransientFailure**: `boolean`

Defined in: [types/proxy.ts:1289](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1289)

---

### sawNetworkError

> **sawNetworkError**: `boolean`

Defined in: [types/proxy.ts:1290](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1290)

---

### upstreamSpan?

> `optional` **upstreamSpan?**: `Span`

Defined in: [types/proxy.ts:1291](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1291)
