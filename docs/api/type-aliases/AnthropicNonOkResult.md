[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicNonOkResult

# Type Alias: AnthropicNonOkResult

> **AnthropicNonOkResult** = `object`

Defined in: [types/proxy.ts:1433](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1433)

## Properties

### response?

> `optional` **response?**: `Response` \| `unknown`

Defined in: [types/proxy.ts:1434](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1434)

---

### continueLoop

> **continueLoop**: `boolean`

Defined in: [types/proxy.ts:1435](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1435)

---

### retrySameAccount?

> `optional` **retrySameAccount?**: `boolean`

Defined in: [types/proxy.ts:1436](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1436)

---

### retryDelayMs?

> `optional` **retryDelayMs?**: `number`

Defined in: [types/proxy.ts:1438](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1438)

Failure-path pacing before rotating after provider-wide overload.

---

### lastError

> **lastError**: `unknown`

Defined in: [types/proxy.ts:1439](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1439)

---

### authFailureMessage

> **authFailureMessage**: `string` \| `null`

Defined in: [types/proxy.ts:1440](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1440)

---

### sawTransientFailure

> **sawTransientFailure**: `boolean`

Defined in: [types/proxy.ts:1441](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1441)

---

### invalidRequestFailure

> **invalidRequestFailure**: \{ `status`: `number`; `body`: `string`; `contentType?`: `string`; \} \| `null`

Defined in: [types/proxy.ts:1442](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1442)

---

### entitlementFailure

> **entitlementFailure**: [`AnthropicEntitlementFailure`](AnthropicEntitlementFailure.md) \| `null`

Defined in: [types/proxy.ts:1447](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1447)

---

### upstreamSpan?

> `optional` **upstreamSpan?**: `Span`

Defined in: [types/proxy.ts:1448](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1448)
