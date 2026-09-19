[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicLoopState

# Type Alias: AnthropicLoopState

> **AnthropicLoopState** = `object`

Defined in: [types/proxy.ts:1187](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1187)

## Properties

### lastError

> **lastError**: `unknown`

Defined in: [types/proxy.ts:1188](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1188)

---

### sawRateLimit

> **sawRateLimit**: `boolean`

Defined in: [types/proxy.ts:1189](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1189)

---

### sawNetworkError

> **sawNetworkError**: `boolean`

Defined in: [types/proxy.ts:1190](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1190)

---

### sawTransientFailure

> **sawTransientFailure**: `boolean`

Defined in: [types/proxy.ts:1191](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1191)

---

### invalidRequestFailure

> **invalidRequestFailure**: \{ `status`: `number`; `body`: `string`; `contentType?`: `string`; \} \| `null`

Defined in: [types/proxy.ts:1192](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1192)

---

### authFailureMessage

> **authFailureMessage**: `string` \| `null`

Defined in: [types/proxy.ts:1197](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1197)

---

### authCooldownMessage

> **authCooldownMessage**: `string` \| `null`

Defined in: [types/proxy.ts:1198](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1198)

---

### entitlementFailure

> **entitlementFailure**: [`AnthropicEntitlementFailure`](AnthropicEntitlementFailure.md) \| `null`

Defined in: [types/proxy.ts:1199](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1199)

---

### scopedExhaustion

> **scopedExhaustion**: [`AnthropicScopedExhaustion`](AnthropicScopedExhaustion.md) \| `null`

Defined in: [types/proxy.ts:1200](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1200)

---

### fallbackFailureMessage?

> `optional` **fallbackFailureMessage?**: `string`

Defined in: [types/proxy.ts:1201](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1201)

---

### attemptNumber

> **attemptNumber**: `number`

Defined in: [types/proxy.ts:1202](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1202)

---

### lastTransportErrorCode?

> `optional` **lastTransportErrorCode?**: `string`

Defined in: [types/proxy.ts:1203](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1203)

---

### lastTransportScope?

> `optional` **lastTransportScope?**: [`ProxyNetworkTransportScope`](ProxyNetworkTransportScope.md)

Defined in: [types/proxy.ts:1204](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1204)
