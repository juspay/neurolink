[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicLoopState

# Type Alias: AnthropicLoopState

> **AnthropicLoopState** = `object`

Defined in: [types/proxy.ts:1091](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1091)

## Properties

### lastError

> **lastError**: `unknown`

Defined in: [types/proxy.ts:1092](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1092)

---

### sawRateLimit

> **sawRateLimit**: `boolean`

Defined in: [types/proxy.ts:1093](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1093)

---

### sawNetworkError

> **sawNetworkError**: `boolean`

Defined in: [types/proxy.ts:1094](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1094)

---

### sawTransientFailure

> **sawTransientFailure**: `boolean`

Defined in: [types/proxy.ts:1095](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1095)

---

### invalidRequestFailure

> **invalidRequestFailure**: \{ `status`: `number`; `body`: `string`; `contentType?`: `string`; \} \| `null`

Defined in: [types/proxy.ts:1096](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1096)

---

### authFailureMessage

> **authFailureMessage**: `string` \| `null`

Defined in: [types/proxy.ts:1101](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1101)

---

### authCooldownMessage

> **authCooldownMessage**: `string` \| `null`

Defined in: [types/proxy.ts:1102](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1102)

---

### entitlementFailure

> **entitlementFailure**: [`AnthropicEntitlementFailure`](AnthropicEntitlementFailure.md) \| `null`

Defined in: [types/proxy.ts:1103](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1103)

---

### scopedExhaustion

> **scopedExhaustion**: [`AnthropicScopedExhaustion`](AnthropicScopedExhaustion.md) \| `null`

Defined in: [types/proxy.ts:1104](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1104)

---

### fallbackFailureMessage?

> `optional` **fallbackFailureMessage?**: `string`

Defined in: [types/proxy.ts:1105](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1105)

---

### attemptNumber

> **attemptNumber**: `number`

Defined in: [types/proxy.ts:1106](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1106)

---

### lastTransportErrorCode?

> `optional` **lastTransportErrorCode?**: `string`

Defined in: [types/proxy.ts:1107](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1107)

---

### lastTransportScope?

> `optional` **lastTransportScope?**: [`ProxyNetworkTransportScope`](ProxyNetworkTransportScope.md)

Defined in: [types/proxy.ts:1108](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1108)
