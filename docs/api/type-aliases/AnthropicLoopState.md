[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicLoopState

# Type Alias: AnthropicLoopState

> **AnthropicLoopState** = `object`

Defined in: [types/proxy.ts:1322](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1322)

## Properties

### lastError

> **lastError**: `unknown`

Defined in: [types/proxy.ts:1323](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1323)

---

### sawRateLimit

> **sawRateLimit**: `boolean`

Defined in: [types/proxy.ts:1324](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1324)

---

### sawNetworkError

> **sawNetworkError**: `boolean`

Defined in: [types/proxy.ts:1325](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1325)

---

### sawTransientFailure

> **sawTransientFailure**: `boolean`

Defined in: [types/proxy.ts:1326](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1326)

---

### invalidRequestFailure

> **invalidRequestFailure**: \{ `status`: `number`; `body`: `string`; `contentType?`: `string`; \} \| `null`

Defined in: [types/proxy.ts:1327](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1327)

---

### authFailureMessage

> **authFailureMessage**: `string` \| `null`

Defined in: [types/proxy.ts:1332](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1332)

---

### authCooldownMessage

> **authCooldownMessage**: `string` \| `null`

Defined in: [types/proxy.ts:1333](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1333)

---

### entitlementFailure

> **entitlementFailure**: [`AnthropicEntitlementFailure`](AnthropicEntitlementFailure.md) \| `null`

Defined in: [types/proxy.ts:1334](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1334)

---

### scopedExhaustion

> **scopedExhaustion**: [`AnthropicScopedExhaustion`](AnthropicScopedExhaustion.md) \| `null`

Defined in: [types/proxy.ts:1335](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1335)

---

### fallbackFailureMessage?

> `optional` **fallbackFailureMessage?**: `string`

Defined in: [types/proxy.ts:1336](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1336)

---

### attemptNumber

> **attemptNumber**: `number`

Defined in: [types/proxy.ts:1337](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1337)

---

### lastTransportErrorCode?

> `optional` **lastTransportErrorCode?**: `string`

Defined in: [types/proxy.ts:1338](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1338)

---

### lastTransportScope?

> `optional` **lastTransportScope?**: [`ProxyNetworkTransportScope`](ProxyNetworkTransportScope.md)

Defined in: [types/proxy.ts:1339](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1339)
