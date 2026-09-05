[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicNonOkResult

# Type Alias: AnthropicNonOkResult

> **AnthropicNonOkResult** = `object`

Defined in: [types/proxy.ts:1003](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1003)

## Properties

### response?

> `optional` **response?**: `Response` \| `unknown`

Defined in: [types/proxy.ts:1004](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1004)

---

### continueLoop

> **continueLoop**: `boolean`

Defined in: [types/proxy.ts:1005](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1005)

---

### retrySameAccount?

> `optional` **retrySameAccount?**: `boolean`

Defined in: [types/proxy.ts:1006](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1006)

---

### retryDelayMs?

> `optional` **retryDelayMs?**: `number`

Defined in: [types/proxy.ts:1008](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1008)

Failure-path pacing before rotating after provider-wide overload.

---

### lastError

> **lastError**: `unknown`

Defined in: [types/proxy.ts:1009](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1009)

---

### authFailureMessage

> **authFailureMessage**: `string` \| `null`

Defined in: [types/proxy.ts:1010](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1010)

---

### sawTransientFailure

> **sawTransientFailure**: `boolean`

Defined in: [types/proxy.ts:1011](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1011)

---

### invalidRequestFailure

> **invalidRequestFailure**: \{ `status`: `number`; `body`: `string`; `contentType?`: `string`; \} \| `null`

Defined in: [types/proxy.ts:1012](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1012)

---

### entitlementFailure

> **entitlementFailure**: [`AnthropicEntitlementFailure`](AnthropicEntitlementFailure.md) \| `null`

Defined in: [types/proxy.ts:1017](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1017)

---

### upstreamSpan?

> `optional` **upstreamSpan?**: `Span`

Defined in: [types/proxy.ts:1018](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1018)
