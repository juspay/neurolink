[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicLoopState

# Type Alias: AnthropicLoopState

> **AnthropicLoopState** = `object`

Defined in: [types/proxy.ts:892](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L892)

## Properties

### lastError

> **lastError**: `unknown`

Defined in: [types/proxy.ts:893](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L893)

---

### sawRateLimit

> **sawRateLimit**: `boolean`

Defined in: [types/proxy.ts:894](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L894)

---

### sawNetworkError

> **sawNetworkError**: `boolean`

Defined in: [types/proxy.ts:895](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L895)

---

### sawTransientFailure

> **sawTransientFailure**: `boolean`

Defined in: [types/proxy.ts:896](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L896)

---

### invalidRequestFailure

> **invalidRequestFailure**: \{ `status`: `number`; `body`: `string`; `contentType?`: `string`; \} \| `null`

Defined in: [types/proxy.ts:897](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L897)

---

### authFailureMessage

> **authFailureMessage**: `string` \| `null`

Defined in: [types/proxy.ts:902](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L902)

---

### authCooldownMessage

> **authCooldownMessage**: `string` \| `null`

Defined in: [types/proxy.ts:903](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L903)

---

### entitlementFailure

> **entitlementFailure**: [`AnthropicEntitlementFailure`](AnthropicEntitlementFailure.md) \| `null`

Defined in: [types/proxy.ts:904](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L904)

---

### scopedExhaustion

> **scopedExhaustion**: [`AnthropicScopedExhaustion`](AnthropicScopedExhaustion.md) \| `null`

Defined in: [types/proxy.ts:905](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L905)

---

### fallbackFailureMessage?

> `optional` **fallbackFailureMessage?**: `string`

Defined in: [types/proxy.ts:906](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L906)

---

### attemptNumber

> **attemptNumber**: `number`

Defined in: [types/proxy.ts:907](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L907)

---

### lastTransportErrorCode?

> `optional` **lastTransportErrorCode?**: `string`

Defined in: [types/proxy.ts:908](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L908)

---

### lastTransportScope?

> `optional` **lastTransportScope?**: [`ProxyNetworkTransportScope`](ProxyNetworkTransportScope.md)

Defined in: [types/proxy.ts:909](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L909)
