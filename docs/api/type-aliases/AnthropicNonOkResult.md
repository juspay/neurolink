[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicNonOkResult

# Type Alias: AnthropicNonOkResult

> **AnthropicNonOkResult** = `object`

Defined in: [types/proxy.ts:1368](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1368)

## Properties

### response?

> `optional` **response?**: `Response` \| `unknown`

Defined in: [types/proxy.ts:1369](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1369)

---

### continueLoop

> **continueLoop**: `boolean`

Defined in: [types/proxy.ts:1370](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1370)

---

### retrySameAccount?

> `optional` **retrySameAccount?**: `boolean`

Defined in: [types/proxy.ts:1371](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1371)

---

### retryDelayMs?

> `optional` **retryDelayMs?**: `number`

Defined in: [types/proxy.ts:1373](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1373)

Failure-path pacing before rotating after provider-wide overload.

---

### lastError

> **lastError**: `unknown`

Defined in: [types/proxy.ts:1374](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1374)

---

### authFailureMessage

> **authFailureMessage**: `string` \| `null`

Defined in: [types/proxy.ts:1375](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1375)

---

### sawTransientFailure

> **sawTransientFailure**: `boolean`

Defined in: [types/proxy.ts:1376](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1376)

---

### invalidRequestFailure

> **invalidRequestFailure**: \{ `status`: `number`; `body`: `string`; `contentType?`: `string`; \} \| `null`

Defined in: [types/proxy.ts:1377](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1377)

---

### entitlementFailure

> **entitlementFailure**: [`AnthropicEntitlementFailure`](AnthropicEntitlementFailure.md) \| `null`

Defined in: [types/proxy.ts:1382](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1382)

---

### upstreamSpan?

> `optional` **upstreamSpan?**: `Span`

Defined in: [types/proxy.ts:1383](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1383)
