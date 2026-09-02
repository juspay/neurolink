[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicNonOkResult

# Type Alias: AnthropicNonOkResult

> **AnthropicNonOkResult** = `object`

Defined in: [types/proxy.ts:998](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L998)

## Properties

### response?

> `optional` **response?**: `Response` \| `unknown`

Defined in: [types/proxy.ts:999](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L999)

---

### continueLoop

> **continueLoop**: `boolean`

Defined in: [types/proxy.ts:1000](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1000)

---

### retrySameAccount?

> `optional` **retrySameAccount?**: `boolean`

Defined in: [types/proxy.ts:1001](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1001)

---

### retryDelayMs?

> `optional` **retryDelayMs?**: `number`

Defined in: [types/proxy.ts:1003](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1003)

Failure-path pacing before rotating after provider-wide overload.

---

### lastError

> **lastError**: `unknown`

Defined in: [types/proxy.ts:1004](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1004)

---

### authFailureMessage

> **authFailureMessage**: `string` \| `null`

Defined in: [types/proxy.ts:1005](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1005)

---

### sawTransientFailure

> **sawTransientFailure**: `boolean`

Defined in: [types/proxy.ts:1006](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1006)

---

### invalidRequestFailure

> **invalidRequestFailure**: \{ `status`: `number`; `body`: `string`; `contentType?`: `string`; \} \| `null`

Defined in: [types/proxy.ts:1007](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1007)

---

### entitlementFailure

> **entitlementFailure**: [`AnthropicEntitlementFailure`](AnthropicEntitlementFailure.md) \| `null`

Defined in: [types/proxy.ts:1012](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1012)

---

### upstreamSpan?

> `optional` **upstreamSpan?**: `Span`

Defined in: [types/proxy.ts:1013](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1013)
