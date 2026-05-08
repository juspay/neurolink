[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyAccount

# Type Alias: ProxyAccount

> **ProxyAccount** = `object`

Defined in: [types/subscription.ts:1079](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L1079)

A single Claude account in the pool

## Properties

### id

> **id**: `string`

Defined in: [types/subscription.ts:1080](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L1080)

---

### label?

> `optional` **label?**: `string`

Defined in: [types/subscription.ts:1081](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L1081)

---

### type

> **type**: `"oauth"` \| `"api_key"`

Defined in: [types/subscription.ts:1082](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L1082)

---

### tokens?

> `optional` **tokens?**: [`StoredOAuthTokens`](StoredOAuthTokens.md)

Defined in: [types/subscription.ts:1083](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L1083)

---

### apiKey?

> `optional` **apiKey?**: `string`

Defined in: [types/subscription.ts:1084](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L1084)

---

### status

> **status**: `"healthy"` \| `"cooling"` \| `"disabled"`

Defined in: [types/subscription.ts:1085](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L1085)

---

### cooldownUntil?

> `optional` **cooldownUntil?**: `number`

Defined in: [types/subscription.ts:1086](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L1086)

---

### consecutiveFailures

> **consecutiveFailures**: `number`

Defined in: [types/subscription.ts:1087](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L1087)

---

### requestCount

> **requestCount**: `number`

Defined in: [types/subscription.ts:1088](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L1088)

---

### lastUsed

> **lastUsed**: `number`

Defined in: [types/subscription.ts:1089](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L1089)

---

### subscriptionTier?

> `optional` **subscriptionTier?**: [`ClaudeSubscriptionTier`](ClaudeSubscriptionTier.md)

Defined in: [types/subscription.ts:1090](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L1090)
