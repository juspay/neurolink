[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicNonOkResult

# Type Alias: AnthropicNonOkResult

> **AnthropicNonOkResult** = `object`

Defined in: [types/proxy.ts:935](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L935)

## Properties

### response?

> `optional` **response?**: `Response` \| `unknown`

Defined in: [types/proxy.ts:936](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L936)

---

### continueLoop

> **continueLoop**: `boolean`

Defined in: [types/proxy.ts:937](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L937)

---

### retrySameAccount?

> `optional` **retrySameAccount?**: `boolean`

Defined in: [types/proxy.ts:938](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L938)

---

### retryDelayMs?

> `optional` **retryDelayMs?**: `number`

Defined in: [types/proxy.ts:940](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L940)

Failure-path pacing before rotating after provider-wide overload.

---

### lastError

> **lastError**: `unknown`

Defined in: [types/proxy.ts:941](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L941)

---

### authFailureMessage

> **authFailureMessage**: `string` \| `null`

Defined in: [types/proxy.ts:942](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L942)

---

### sawTransientFailure

> **sawTransientFailure**: `boolean`

Defined in: [types/proxy.ts:943](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L943)

---

### invalidRequestFailure

> **invalidRequestFailure**: \{ `status`: `number`; `body`: `string`; `contentType?`: `string`; \} \| `null`

Defined in: [types/proxy.ts:944](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L944)

---

### entitlementFailure

> **entitlementFailure**: [`AnthropicEntitlementFailure`](AnthropicEntitlementFailure.md) \| `null`

Defined in: [types/proxy.ts:949](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L949)

---

### upstreamSpan?

> `optional` **upstreamSpan?**: `Span`

Defined in: [types/proxy.ts:950](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L950)
