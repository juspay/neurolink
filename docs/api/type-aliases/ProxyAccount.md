[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyAccount

# Type Alias: ProxyAccount

> **ProxyAccount** = `object`

Defined in: [types/subscription.ts:1163](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1163)

A single Claude account in the pool

## Properties

### id

> **id**: `string`

Defined in: [types/subscription.ts:1164](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1164)

---

### label?

> `optional` **label?**: `string`

Defined in: [types/subscription.ts:1165](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1165)

---

### type

> **type**: `"oauth"` \| `"api_key"`

Defined in: [types/subscription.ts:1166](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1166)

---

### tokens?

> `optional` **tokens?**: [`StoredOAuthTokens`](StoredOAuthTokens.md)

Defined in: [types/subscription.ts:1167](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1167)

---

### apiKey?

> `optional` **apiKey?**: `string`

Defined in: [types/subscription.ts:1168](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1168)

---

### status

> **status**: `"healthy"` \| `"cooling"` \| `"disabled"`

Defined in: [types/subscription.ts:1169](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1169)

---

### cooldownUntil?

> `optional` **cooldownUntil?**: `number`

Defined in: [types/subscription.ts:1170](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1170)

---

### consecutiveFailures

> **consecutiveFailures**: `number`

Defined in: [types/subscription.ts:1171](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1171)

---

### requestCount

> **requestCount**: `number`

Defined in: [types/subscription.ts:1172](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1172)

---

### lastUsed

> **lastUsed**: `number`

Defined in: [types/subscription.ts:1173](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1173)

---

### subscriptionTier?

> `optional` **subscriptionTier?**: [`ClaudeSubscriptionTier`](ClaudeSubscriptionTier.md)

Defined in: [types/subscription.ts:1174](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1174)
