[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyAccount

# Type Alias: ProxyAccount

> **ProxyAccount** = `object`

Defined in: [types/subscription.ts:1161](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1161)

A single Claude account in the pool

## Properties

### id

> **id**: `string`

Defined in: [types/subscription.ts:1162](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1162)

---

### label?

> `optional` **label?**: `string`

Defined in: [types/subscription.ts:1163](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1163)

---

### type

> **type**: `"oauth"` \| `"api_key"`

Defined in: [types/subscription.ts:1164](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1164)

---

### tokens?

> `optional` **tokens?**: [`StoredOAuthTokens`](StoredOAuthTokens.md)

Defined in: [types/subscription.ts:1165](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1165)

---

### apiKey?

> `optional` **apiKey?**: `string`

Defined in: [types/subscription.ts:1166](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1166)

---

### status

> **status**: `"healthy"` \| `"cooling"` \| `"disabled"`

Defined in: [types/subscription.ts:1167](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1167)

---

### cooldownUntil?

> `optional` **cooldownUntil?**: `number`

Defined in: [types/subscription.ts:1168](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1168)

---

### consecutiveFailures

> **consecutiveFailures**: `number`

Defined in: [types/subscription.ts:1169](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1169)

---

### requestCount

> **requestCount**: `number`

Defined in: [types/subscription.ts:1170](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1170)

---

### lastUsed

> **lastUsed**: `number`

Defined in: [types/subscription.ts:1171](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1171)

---

### subscriptionTier?

> `optional` **subscriptionTier?**: [`ClaudeSubscriptionTier`](ClaudeSubscriptionTier.md)

Defined in: [types/subscription.ts:1172](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1172)
