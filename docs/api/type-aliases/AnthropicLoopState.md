[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicLoopState

# Type Alias: AnthropicLoopState

> **AnthropicLoopState** = `object`

Defined in: [types/proxy.ts:1258](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1258)

## Properties

### lastError

> **lastError**: `unknown`

Defined in: [types/proxy.ts:1259](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1259)

---

### sawRateLimit

> **sawRateLimit**: `boolean`

Defined in: [types/proxy.ts:1260](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1260)

---

### sawNetworkError

> **sawNetworkError**: `boolean`

Defined in: [types/proxy.ts:1261](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1261)

---

### sawTransientFailure

> **sawTransientFailure**: `boolean`

Defined in: [types/proxy.ts:1262](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1262)

---

### invalidRequestFailure

> **invalidRequestFailure**: \{ `status`: `number`; `body`: `string`; `contentType?`: `string`; \} \| `null`

Defined in: [types/proxy.ts:1263](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1263)

---

### authFailureMessage

> **authFailureMessage**: `string` \| `null`

Defined in: [types/proxy.ts:1268](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1268)

---

### authCooldownMessage

> **authCooldownMessage**: `string` \| `null`

Defined in: [types/proxy.ts:1269](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1269)

---

### entitlementFailure

> **entitlementFailure**: [`AnthropicEntitlementFailure`](AnthropicEntitlementFailure.md) \| `null`

Defined in: [types/proxy.ts:1270](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1270)

---

### scopedExhaustion

> **scopedExhaustion**: [`AnthropicScopedExhaustion`](AnthropicScopedExhaustion.md) \| `null`

Defined in: [types/proxy.ts:1271](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1271)

---

### fallbackFailureMessage?

> `optional` **fallbackFailureMessage?**: `string`

Defined in: [types/proxy.ts:1272](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1272)

---

### attemptNumber

> **attemptNumber**: `number`

Defined in: [types/proxy.ts:1273](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1273)

---

### lastTransportErrorCode?

> `optional` **lastTransportErrorCode?**: `string`

Defined in: [types/proxy.ts:1274](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1274)

---

### lastTransportScope?

> `optional` **lastTransportScope?**: [`ProxyNetworkTransportScope`](ProxyNetworkTransportScope.md)

Defined in: [types/proxy.ts:1275](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1275)
