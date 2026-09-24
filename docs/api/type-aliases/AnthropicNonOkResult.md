[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicNonOkResult

# Type Alias: AnthropicNonOkResult

> **AnthropicNonOkResult** = `object`

Defined in: [types/proxy.ts:1447](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1447)

## Properties

### response?

> `optional` **response?**: `Response` \| `unknown`

Defined in: [types/proxy.ts:1448](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1448)

---

### continueLoop

> **continueLoop**: `boolean`

Defined in: [types/proxy.ts:1449](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1449)

---

### retrySameAccount?

> `optional` **retrySameAccount?**: `boolean`

Defined in: [types/proxy.ts:1450](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1450)

---

### retryDelayMs?

> `optional` **retryDelayMs?**: `number`

Defined in: [types/proxy.ts:1452](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1452)

Failure-path pacing before rotating after provider-wide overload.

---

### lastError

> **lastError**: `unknown`

Defined in: [types/proxy.ts:1453](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1453)

---

### authFailureMessage

> **authFailureMessage**: `string` \| `null`

Defined in: [types/proxy.ts:1454](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1454)

---

### sawTransientFailure

> **sawTransientFailure**: `boolean`

Defined in: [types/proxy.ts:1455](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1455)

---

### invalidRequestFailure

> **invalidRequestFailure**: \{ `status`: `number`; `body`: `string`; `contentType?`: `string`; \} \| `null`

Defined in: [types/proxy.ts:1456](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1456)

---

### entitlementFailure

> **entitlementFailure**: [`AnthropicEntitlementFailure`](AnthropicEntitlementFailure.md) \| `null`

Defined in: [types/proxy.ts:1461](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1461)

---

### upstreamSpan?

> `optional` **upstreamSpan?**: `Span`

Defined in: [types/proxy.ts:1462](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1462)
