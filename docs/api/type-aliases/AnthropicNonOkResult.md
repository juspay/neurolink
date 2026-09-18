[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicNonOkResult

# Type Alias: AnthropicNonOkResult

> **AnthropicNonOkResult** = `object`

Defined in: [types/proxy.ts:1214](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1214)

## Properties

### response?

> `optional` **response?**: `Response` \| `unknown`

Defined in: [types/proxy.ts:1215](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1215)

---

### continueLoop

> **continueLoop**: `boolean`

Defined in: [types/proxy.ts:1216](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1216)

---

### retrySameAccount?

> `optional` **retrySameAccount?**: `boolean`

Defined in: [types/proxy.ts:1217](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1217)

---

### retryDelayMs?

> `optional` **retryDelayMs?**: `number`

Defined in: [types/proxy.ts:1219](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1219)

Failure-path pacing before rotating after provider-wide overload.

---

### lastError

> **lastError**: `unknown`

Defined in: [types/proxy.ts:1220](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1220)

---

### authFailureMessage

> **authFailureMessage**: `string` \| `null`

Defined in: [types/proxy.ts:1221](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1221)

---

### sawTransientFailure

> **sawTransientFailure**: `boolean`

Defined in: [types/proxy.ts:1222](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1222)

---

### invalidRequestFailure

> **invalidRequestFailure**: \{ `status`: `number`; `body`: `string`; `contentType?`: `string`; \} \| `null`

Defined in: [types/proxy.ts:1223](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1223)

---

### entitlementFailure

> **entitlementFailure**: [`AnthropicEntitlementFailure`](AnthropicEntitlementFailure.md) \| `null`

Defined in: [types/proxy.ts:1228](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1228)

---

### upstreamSpan?

> `optional` **upstreamSpan?**: `Span`

Defined in: [types/proxy.ts:1229](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1229)
