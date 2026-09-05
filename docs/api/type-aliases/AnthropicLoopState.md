[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicLoopState

# Type Alias: AnthropicLoopState

> **AnthropicLoopState** = `object`

Defined in: [types/proxy.ts:897](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L897)

## Properties

### lastError

> **lastError**: `unknown`

Defined in: [types/proxy.ts:898](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L898)

---

### sawRateLimit

> **sawRateLimit**: `boolean`

Defined in: [types/proxy.ts:899](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L899)

---

### sawNetworkError

> **sawNetworkError**: `boolean`

Defined in: [types/proxy.ts:900](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L900)

---

### sawTransientFailure

> **sawTransientFailure**: `boolean`

Defined in: [types/proxy.ts:901](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L901)

---

### invalidRequestFailure

> **invalidRequestFailure**: \{ `status`: `number`; `body`: `string`; `contentType?`: `string`; \} \| `null`

Defined in: [types/proxy.ts:902](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L902)

---

### authFailureMessage

> **authFailureMessage**: `string` \| `null`

Defined in: [types/proxy.ts:907](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L907)

---

### authCooldownMessage

> **authCooldownMessage**: `string` \| `null`

Defined in: [types/proxy.ts:908](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L908)

---

### entitlementFailure

> **entitlementFailure**: [`AnthropicEntitlementFailure`](AnthropicEntitlementFailure.md) \| `null`

Defined in: [types/proxy.ts:909](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L909)

---

### scopedExhaustion

> **scopedExhaustion**: [`AnthropicScopedExhaustion`](AnthropicScopedExhaustion.md) \| `null`

Defined in: [types/proxy.ts:910](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L910)

---

### fallbackFailureMessage?

> `optional` **fallbackFailureMessage?**: `string`

Defined in: [types/proxy.ts:911](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L911)

---

### attemptNumber

> **attemptNumber**: `number`

Defined in: [types/proxy.ts:912](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L912)

---

### lastTransportErrorCode?

> `optional` **lastTransportErrorCode?**: `string`

Defined in: [types/proxy.ts:913](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L913)

---

### lastTransportScope?

> `optional` **lastTransportScope?**: [`ProxyNetworkTransportScope`](ProxyNetworkTransportScope.md)

Defined in: [types/proxy.ts:914](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L914)
