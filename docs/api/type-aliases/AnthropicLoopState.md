[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicLoopState

# Type Alias: AnthropicLoopState

> **AnthropicLoopState** = `object`

## Properties

### lastError

> **lastError**: `unknown`

---

### sawRateLimit

> **sawRateLimit**: `boolean`

---

### sawNetworkError

> **sawNetworkError**: `boolean`

---

### sawTransientFailure

> **sawTransientFailure**: `boolean`

---

### invalidRequestFailure

> **invalidRequestFailure**: \{ `status`: `number`; `body`: `string`; `contentType?`: `string`; \} \| `null`

---

### authFailureMessage

> **authFailureMessage**: `string` \| `null`

---

### authCooldownMessage

> **authCooldownMessage**: `string` \| `null`

---

### entitlementFailure

> **entitlementFailure**: [`AnthropicEntitlementFailure`](AnthropicEntitlementFailure.md) \| `null`

---

### scopedExhaustion

> **scopedExhaustion**: [`AnthropicScopedExhaustion`](AnthropicScopedExhaustion.md) \| `null`

---

### fallbackFailureMessage?

> `optional` **fallbackFailureMessage?**: `string`

---

### attemptNumber

> **attemptNumber**: `number`

---

### lastTransportErrorCode?

> `optional` **lastTransportErrorCode?**: `string`

---

### lastTransportScope?

> `optional` **lastTransportScope?**: [`ProxyNetworkTransportScope`](ProxyNetworkTransportScope.md)
