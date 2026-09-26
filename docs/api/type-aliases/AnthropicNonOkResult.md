[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicNonOkResult

# Type Alias: AnthropicNonOkResult

> **AnthropicNonOkResult** = `object`

Defined in: [types/proxy.ts:1457](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1457)

## Properties

### response?

> `optional` **response?**: `Response` \| `unknown`

Defined in: [types/proxy.ts:1458](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1458)

---

### continueLoop

> **continueLoop**: `boolean`

Defined in: [types/proxy.ts:1459](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1459)

---

### retrySameAccount?

> `optional` **retrySameAccount?**: `boolean`

Defined in: [types/proxy.ts:1460](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1460)

---

### retryDelayMs?

> `optional` **retryDelayMs?**: `number`

Defined in: [types/proxy.ts:1462](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1462)

Failure-path pacing before rotating after provider-wide overload.

---

### lastError

> **lastError**: `unknown`

Defined in: [types/proxy.ts:1463](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1463)

---

### authFailureMessage

> **authFailureMessage**: `string` \| `null`

Defined in: [types/proxy.ts:1464](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1464)

---

### sawTransientFailure

> **sawTransientFailure**: `boolean`

Defined in: [types/proxy.ts:1465](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1465)

---

### invalidRequestFailure

> **invalidRequestFailure**: \{ `status`: `number`; `body`: `string`; `contentType?`: `string`; \} \| `null`

Defined in: [types/proxy.ts:1466](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1466)

---

### entitlementFailure

> **entitlementFailure**: [`AnthropicEntitlementFailure`](AnthropicEntitlementFailure.md) \| `null`

Defined in: [types/proxy.ts:1471](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1471)

---

### upstreamSpan?

> `optional` **upstreamSpan?**: `Span`

Defined in: [types/proxy.ts:1472](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1472)
