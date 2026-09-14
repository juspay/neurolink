[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicNonOkResult

# Type Alias: AnthropicNonOkResult

> **AnthropicNonOkResult** = `object`

Defined in: [types/proxy.ts:1190](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1190)

## Properties

### response?

> `optional` **response?**: `Response` \| `unknown`

Defined in: [types/proxy.ts:1191](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1191)

---

### continueLoop

> **continueLoop**: `boolean`

Defined in: [types/proxy.ts:1192](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1192)

---

### retrySameAccount?

> `optional` **retrySameAccount?**: `boolean`

Defined in: [types/proxy.ts:1193](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1193)

---

### retryDelayMs?

> `optional` **retryDelayMs?**: `number`

Defined in: [types/proxy.ts:1195](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1195)

Failure-path pacing before rotating after provider-wide overload.

---

### lastError

> **lastError**: `unknown`

Defined in: [types/proxy.ts:1196](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1196)

---

### authFailureMessage

> **authFailureMessage**: `string` \| `null`

Defined in: [types/proxy.ts:1197](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1197)

---

### sawTransientFailure

> **sawTransientFailure**: `boolean`

Defined in: [types/proxy.ts:1198](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1198)

---

### invalidRequestFailure

> **invalidRequestFailure**: \{ `status`: `number`; `body`: `string`; `contentType?`: `string`; \} \| `null`

Defined in: [types/proxy.ts:1199](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1199)

---

### entitlementFailure

> **entitlementFailure**: [`AnthropicEntitlementFailure`](AnthropicEntitlementFailure.md) \| `null`

Defined in: [types/proxy.ts:1204](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1204)

---

### upstreamSpan?

> `optional` **upstreamSpan?**: `Span`

Defined in: [types/proxy.ts:1205](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1205)
