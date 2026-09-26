[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicNonOkResult

# Type Alias: AnthropicNonOkResult

> **AnthropicNonOkResult** = `object`

Defined in: [types/proxy.ts:1435](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1435)

## Properties

### response?

> `optional` **response?**: `Response` \| `unknown`

Defined in: [types/proxy.ts:1436](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1436)

---

### continueLoop

> **continueLoop**: `boolean`

Defined in: [types/proxy.ts:1437](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1437)

---

### retrySameAccount?

> `optional` **retrySameAccount?**: `boolean`

Defined in: [types/proxy.ts:1438](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1438)

---

### retryDelayMs?

> `optional` **retryDelayMs?**: `number`

Defined in: [types/proxy.ts:1440](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1440)

Failure-path pacing before rotating after provider-wide overload.

---

### lastError

> **lastError**: `unknown`

Defined in: [types/proxy.ts:1441](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1441)

---

### authFailureMessage

> **authFailureMessage**: `string` \| `null`

Defined in: [types/proxy.ts:1442](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1442)

---

### sawTransientFailure

> **sawTransientFailure**: `boolean`

Defined in: [types/proxy.ts:1443](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1443)

---

### invalidRequestFailure

> **invalidRequestFailure**: \{ `status`: `number`; `body`: `string`; `contentType?`: `string`; \} \| `null`

Defined in: [types/proxy.ts:1444](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1444)

---

### entitlementFailure

> **entitlementFailure**: [`AnthropicEntitlementFailure`](AnthropicEntitlementFailure.md) \| `null`

Defined in: [types/proxy.ts:1449](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1449)

---

### upstreamSpan?

> `optional` **upstreamSpan?**: `Span`

Defined in: [types/proxy.ts:1450](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1450)
