[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyAccount

# Type Alias: ProxyAccount

> **ProxyAccount** = `object`

A single Claude account in the pool

## Properties

### id

> **id**: `string`

---

### label?

> `optional` **label?**: `string`

---

### type

> **type**: `"oauth"` \| `"api_key"`

---

### tokens?

> `optional` **tokens?**: [`StoredOAuthTokens`](StoredOAuthTokens.md)

---

### apiKey?

> `optional` **apiKey?**: `string`

---

### status

> **status**: `"healthy"` \| `"cooling"` \| `"disabled"`

---

### cooldownUntil?

> `optional` **cooldownUntil?**: `number`

---

### consecutiveFailures

> **consecutiveFailures**: `number`

---

### requestCount

> **requestCount**: `number`

---

### lastUsed

> **lastUsed**: `number`

---

### subscriptionTier?

> `optional` **subscriptionTier?**: [`ClaudeSubscriptionTier`](ClaudeSubscriptionTier.md)
