[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicLoopState

# Type Alias: AnthropicLoopState

> **AnthropicLoopState** = `object`

Defined in: [types/proxy.ts:886](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L886)

## Properties

### lastError

> **lastError**: `unknown`

Defined in: [types/proxy.ts:887](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L887)

---

### sawRateLimit

> **sawRateLimit**: `boolean`

Defined in: [types/proxy.ts:888](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L888)

---

### sawNetworkError

> **sawNetworkError**: `boolean`

Defined in: [types/proxy.ts:889](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L889)

---

### sawTransientFailure

> **sawTransientFailure**: `boolean`

Defined in: [types/proxy.ts:890](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L890)

---

### invalidRequestFailure

> **invalidRequestFailure**: \{ `status`: `number`; `body`: `string`; `contentType?`: `string`; \} \| `null`

Defined in: [types/proxy.ts:891](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L891)

---

### authFailureMessage

> **authFailureMessage**: `string` \| `null`

Defined in: [types/proxy.ts:896](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L896)

---

### authCooldownMessage

> **authCooldownMessage**: `string` \| `null`

Defined in: [types/proxy.ts:897](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L897)

---

### entitlementFailure

> **entitlementFailure**: [`AnthropicEntitlementFailure`](AnthropicEntitlementFailure.md) \| `null`

Defined in: [types/proxy.ts:898](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L898)

---

### scopedExhaustion

> **scopedExhaustion**: [`AnthropicScopedExhaustion`](AnthropicScopedExhaustion.md) \| `null`

Defined in: [types/proxy.ts:899](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L899)

---

### fallbackFailureMessage?

> `optional` **fallbackFailureMessage?**: `string`

Defined in: [types/proxy.ts:900](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L900)

---

### attemptNumber

> **attemptNumber**: `number`

Defined in: [types/proxy.ts:901](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L901)

---

### lastTransportErrorCode?

> `optional` **lastTransportErrorCode?**: `string`

Defined in: [types/proxy.ts:902](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L902)

---

### lastTransportScope?

> `optional` **lastTransportScope?**: [`ProxyNetworkTransportScope`](ProxyNetworkTransportScope.md)

Defined in: [types/proxy.ts:903](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L903)
