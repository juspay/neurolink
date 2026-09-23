[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicNonOkResult

# Type Alias: AnthropicNonOkResult

> **AnthropicNonOkResult** = `object`

Defined in: [types/proxy.ts:1365](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1365)

## Properties

### response?

> `optional` **response?**: `Response` \| `unknown`

Defined in: [types/proxy.ts:1366](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1366)

---

### continueLoop

> **continueLoop**: `boolean`

Defined in: [types/proxy.ts:1367](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1367)

---

### retrySameAccount?

> `optional` **retrySameAccount?**: `boolean`

Defined in: [types/proxy.ts:1368](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1368)

---

### retryDelayMs?

> `optional` **retryDelayMs?**: `number`

Defined in: [types/proxy.ts:1370](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1370)

Failure-path pacing before rotating after provider-wide overload.

---

### lastError

> **lastError**: `unknown`

Defined in: [types/proxy.ts:1371](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1371)

---

### authFailureMessage

> **authFailureMessage**: `string` \| `null`

Defined in: [types/proxy.ts:1372](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1372)

---

### sawTransientFailure

> **sawTransientFailure**: `boolean`

Defined in: [types/proxy.ts:1373](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1373)

---

### invalidRequestFailure

> **invalidRequestFailure**: \{ `status`: `number`; `body`: `string`; `contentType?`: `string`; \} \| `null`

Defined in: [types/proxy.ts:1374](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1374)

---

### entitlementFailure

> **entitlementFailure**: [`AnthropicEntitlementFailure`](AnthropicEntitlementFailure.md) \| `null`

Defined in: [types/proxy.ts:1379](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1379)

---

### upstreamSpan?

> `optional` **upstreamSpan?**: `Span`

Defined in: [types/proxy.ts:1380](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1380)
