[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicLoopState

# Type Alias: AnthropicLoopState

> **AnthropicLoopState** = `object`

Defined in: [types/proxy.ts:1310](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1310)

## Properties

### lastError

> **lastError**: `unknown`

Defined in: [types/proxy.ts:1311](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1311)

---

### sawRateLimit

> **sawRateLimit**: `boolean`

Defined in: [types/proxy.ts:1312](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1312)

---

### sawNetworkError

> **sawNetworkError**: `boolean`

Defined in: [types/proxy.ts:1313](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1313)

---

### sawTransientFailure

> **sawTransientFailure**: `boolean`

Defined in: [types/proxy.ts:1314](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1314)

---

### invalidRequestFailure

> **invalidRequestFailure**: \{ `status`: `number`; `body`: `string`; `contentType?`: `string`; \} \| `null`

Defined in: [types/proxy.ts:1315](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1315)

---

### authFailureMessage

> **authFailureMessage**: `string` \| `null`

Defined in: [types/proxy.ts:1320](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1320)

---

### authCooldownMessage

> **authCooldownMessage**: `string` \| `null`

Defined in: [types/proxy.ts:1321](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1321)

---

### entitlementFailure

> **entitlementFailure**: [`AnthropicEntitlementFailure`](AnthropicEntitlementFailure.md) \| `null`

Defined in: [types/proxy.ts:1322](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1322)

---

### scopedExhaustion

> **scopedExhaustion**: [`AnthropicScopedExhaustion`](AnthropicScopedExhaustion.md) \| `null`

Defined in: [types/proxy.ts:1323](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1323)

---

### fallbackFailureMessage?

> `optional` **fallbackFailureMessage?**: `string`

Defined in: [types/proxy.ts:1324](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1324)

---

### attemptNumber

> **attemptNumber**: `number`

Defined in: [types/proxy.ts:1325](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1325)

---

### lastTransportErrorCode?

> `optional` **lastTransportErrorCode?**: `string`

Defined in: [types/proxy.ts:1326](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1326)

---

### lastTransportScope?

> `optional` **lastTransportScope?**: [`ProxyNetworkTransportScope`](ProxyNetworkTransportScope.md)

Defined in: [types/proxy.ts:1327](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1327)
