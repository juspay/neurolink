[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicLoopState

# Type Alias: AnthropicLoopState

> **AnthropicLoopState** = `object`

Defined in: [types/proxy.ts:1084](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1084)

## Properties

### lastError

> **lastError**: `unknown`

Defined in: [types/proxy.ts:1085](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1085)

---

### sawRateLimit

> **sawRateLimit**: `boolean`

Defined in: [types/proxy.ts:1086](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1086)

---

### sawNetworkError

> **sawNetworkError**: `boolean`

Defined in: [types/proxy.ts:1087](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1087)

---

### sawTransientFailure

> **sawTransientFailure**: `boolean`

Defined in: [types/proxy.ts:1088](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1088)

---

### invalidRequestFailure

> **invalidRequestFailure**: \{ `status`: `number`; `body`: `string`; `contentType?`: `string`; \} \| `null`

Defined in: [types/proxy.ts:1089](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1089)

---

### authFailureMessage

> **authFailureMessage**: `string` \| `null`

Defined in: [types/proxy.ts:1094](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1094)

---

### authCooldownMessage

> **authCooldownMessage**: `string` \| `null`

Defined in: [types/proxy.ts:1095](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1095)

---

### entitlementFailure

> **entitlementFailure**: [`AnthropicEntitlementFailure`](AnthropicEntitlementFailure.md) \| `null`

Defined in: [types/proxy.ts:1096](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1096)

---

### scopedExhaustion

> **scopedExhaustion**: [`AnthropicScopedExhaustion`](AnthropicScopedExhaustion.md) \| `null`

Defined in: [types/proxy.ts:1097](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1097)

---

### fallbackFailureMessage?

> `optional` **fallbackFailureMessage?**: `string`

Defined in: [types/proxy.ts:1098](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1098)

---

### attemptNumber

> **attemptNumber**: `number`

Defined in: [types/proxy.ts:1099](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1099)

---

### lastTransportErrorCode?

> `optional` **lastTransportErrorCode?**: `string`

Defined in: [types/proxy.ts:1100](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1100)

---

### lastTransportScope?

> `optional` **lastTransportScope?**: [`ProxyNetworkTransportScope`](ProxyNetworkTransportScope.md)

Defined in: [types/proxy.ts:1101](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1101)
