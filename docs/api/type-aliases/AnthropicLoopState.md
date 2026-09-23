[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicLoopState

# Type Alias: AnthropicLoopState

> **AnthropicLoopState** = `object`

Defined in: [types/proxy.ts:1238](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1238)

## Properties

### lastError

> **lastError**: `unknown`

Defined in: [types/proxy.ts:1239](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1239)

---

### sawRateLimit

> **sawRateLimit**: `boolean`

Defined in: [types/proxy.ts:1240](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1240)

---

### sawNetworkError

> **sawNetworkError**: `boolean`

Defined in: [types/proxy.ts:1241](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1241)

---

### sawTransientFailure

> **sawTransientFailure**: `boolean`

Defined in: [types/proxy.ts:1242](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1242)

---

### invalidRequestFailure

> **invalidRequestFailure**: \{ `status`: `number`; `body`: `string`; `contentType?`: `string`; \} \| `null`

Defined in: [types/proxy.ts:1243](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1243)

---

### authFailureMessage

> **authFailureMessage**: `string` \| `null`

Defined in: [types/proxy.ts:1248](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1248)

---

### authCooldownMessage

> **authCooldownMessage**: `string` \| `null`

Defined in: [types/proxy.ts:1249](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1249)

---

### entitlementFailure

> **entitlementFailure**: [`AnthropicEntitlementFailure`](AnthropicEntitlementFailure.md) \| `null`

Defined in: [types/proxy.ts:1250](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1250)

---

### scopedExhaustion

> **scopedExhaustion**: [`AnthropicScopedExhaustion`](AnthropicScopedExhaustion.md) \| `null`

Defined in: [types/proxy.ts:1251](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1251)

---

### fallbackFailureMessage?

> `optional` **fallbackFailureMessage?**: `string`

Defined in: [types/proxy.ts:1252](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1252)

---

### attemptNumber

> **attemptNumber**: `number`

Defined in: [types/proxy.ts:1253](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1253)

---

### lastTransportErrorCode?

> `optional` **lastTransportErrorCode?**: `string`

Defined in: [types/proxy.ts:1254](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1254)

---

### lastTransportScope?

> `optional` **lastTransportScope?**: [`ProxyNetworkTransportScope`](ProxyNetworkTransportScope.md)

Defined in: [types/proxy.ts:1255](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1255)
