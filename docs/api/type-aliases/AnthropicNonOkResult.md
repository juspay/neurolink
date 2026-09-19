[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicNonOkResult

# Type Alias: AnthropicNonOkResult

> **AnthropicNonOkResult** = `object`

Defined in: [types/proxy.ts:1294](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1294)

## Properties

### response?

> `optional` **response?**: `Response` \| `unknown`

Defined in: [types/proxy.ts:1295](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1295)

---

### continueLoop

> **continueLoop**: `boolean`

Defined in: [types/proxy.ts:1296](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1296)

---

### retrySameAccount?

> `optional` **retrySameAccount?**: `boolean`

Defined in: [types/proxy.ts:1297](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1297)

---

### retryDelayMs?

> `optional` **retryDelayMs?**: `number`

Defined in: [types/proxy.ts:1299](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1299)

Failure-path pacing before rotating after provider-wide overload.

---

### lastError

> **lastError**: `unknown`

Defined in: [types/proxy.ts:1300](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1300)

---

### authFailureMessage

> **authFailureMessage**: `string` \| `null`

Defined in: [types/proxy.ts:1301](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1301)

---

### sawTransientFailure

> **sawTransientFailure**: `boolean`

Defined in: [types/proxy.ts:1302](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1302)

---

### invalidRequestFailure

> **invalidRequestFailure**: \{ `status`: `number`; `body`: `string`; `contentType?`: `string`; \} \| `null`

Defined in: [types/proxy.ts:1303](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1303)

---

### entitlementFailure

> **entitlementFailure**: [`AnthropicEntitlementFailure`](AnthropicEntitlementFailure.md) \| `null`

Defined in: [types/proxy.ts:1308](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1308)

---

### upstreamSpan?

> `optional` **upstreamSpan?**: `Span`

Defined in: [types/proxy.ts:1309](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1309)
