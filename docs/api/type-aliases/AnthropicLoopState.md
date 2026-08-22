[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicLoopState

# Type Alias: AnthropicLoopState

> **AnthropicLoopState** = `object`

Defined in: [types/proxy.ts:829](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L829)

## Properties

### lastError

> **lastError**: `unknown`

Defined in: [types/proxy.ts:830](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L830)

---

### sawRateLimit

> **sawRateLimit**: `boolean`

Defined in: [types/proxy.ts:831](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L831)

---

### sawNetworkError

> **sawNetworkError**: `boolean`

Defined in: [types/proxy.ts:832](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L832)

---

### sawTransientFailure

> **sawTransientFailure**: `boolean`

Defined in: [types/proxy.ts:833](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L833)

---

### invalidRequestFailure

> **invalidRequestFailure**: \{ `status`: `number`; `body`: `string`; `contentType?`: `string`; \} \| `null`

Defined in: [types/proxy.ts:834](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L834)

---

### authFailureMessage

> **authFailureMessage**: `string` \| `null`

Defined in: [types/proxy.ts:839](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L839)

---

### authCooldownMessage

> **authCooldownMessage**: `string` \| `null`

Defined in: [types/proxy.ts:840](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L840)

---

### entitlementFailure

> **entitlementFailure**: [`AnthropicEntitlementFailure`](AnthropicEntitlementFailure.md) \| `null`

Defined in: [types/proxy.ts:841](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L841)

---

### scopedExhaustion

> **scopedExhaustion**: [`AnthropicScopedExhaustion`](AnthropicScopedExhaustion.md) \| `null`

Defined in: [types/proxy.ts:842](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L842)

---

### fallbackFailureMessage?

> `optional` **fallbackFailureMessage?**: `string`

Defined in: [types/proxy.ts:843](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L843)

---

### attemptNumber

> **attemptNumber**: `number`

Defined in: [types/proxy.ts:844](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L844)

---

### lastTransportErrorCode?

> `optional` **lastTransportErrorCode?**: `string`

Defined in: [types/proxy.ts:845](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L845)

---

### lastTransportScope?

> `optional` **lastTransportScope?**: [`ProxyNetworkTransportScope`](ProxyNetworkTransportScope.md)

Defined in: [types/proxy.ts:846](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L846)
