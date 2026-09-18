[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicLoopState

# Type Alias: AnthropicLoopState

> **AnthropicLoopState** = `object`

Defined in: [types/proxy.ts:1108](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1108)

## Properties

### lastError

> **lastError**: `unknown`

Defined in: [types/proxy.ts:1109](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1109)

---

### sawRateLimit

> **sawRateLimit**: `boolean`

Defined in: [types/proxy.ts:1110](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1110)

---

### sawNetworkError

> **sawNetworkError**: `boolean`

Defined in: [types/proxy.ts:1111](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1111)

---

### sawTransientFailure

> **sawTransientFailure**: `boolean`

Defined in: [types/proxy.ts:1112](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1112)

---

### invalidRequestFailure

> **invalidRequestFailure**: \{ `status`: `number`; `body`: `string`; `contentType?`: `string`; \} \| `null`

Defined in: [types/proxy.ts:1113](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1113)

---

### authFailureMessage

> **authFailureMessage**: `string` \| `null`

Defined in: [types/proxy.ts:1118](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1118)

---

### authCooldownMessage

> **authCooldownMessage**: `string` \| `null`

Defined in: [types/proxy.ts:1119](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1119)

---

### entitlementFailure

> **entitlementFailure**: [`AnthropicEntitlementFailure`](AnthropicEntitlementFailure.md) \| `null`

Defined in: [types/proxy.ts:1120](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1120)

---

### scopedExhaustion

> **scopedExhaustion**: [`AnthropicScopedExhaustion`](AnthropicScopedExhaustion.md) \| `null`

Defined in: [types/proxy.ts:1121](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1121)

---

### fallbackFailureMessage?

> `optional` **fallbackFailureMessage?**: `string`

Defined in: [types/proxy.ts:1122](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1122)

---

### attemptNumber

> **attemptNumber**: `number`

Defined in: [types/proxy.ts:1123](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1123)

---

### lastTransportErrorCode?

> `optional` **lastTransportErrorCode?**: `string`

Defined in: [types/proxy.ts:1124](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1124)

---

### lastTransportScope?

> `optional` **lastTransportScope?**: [`ProxyNetworkTransportScope`](ProxyNetworkTransportScope.md)

Defined in: [types/proxy.ts:1125](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1125)
