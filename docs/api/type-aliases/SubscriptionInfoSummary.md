[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SubscriptionInfoSummary

# Type Alias: SubscriptionInfoSummary

> **SubscriptionInfoSummary** = `object`

Defined in: [types/subscription.ts:925](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L925)

Subscription information summary for display purposes

## Description

Extended subscription information including human-readable
tier descriptions and usage data. Use for UI display and status reporting.
For basic subscription state, see SubscriptionInfo.

## Properties

### tier

> **tier**: [`ClaudeSubscriptionTier`](ClaudeSubscriptionTier.md)

Defined in: [types/subscription.ts:927](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L927)

Current subscription tier

---

### tierName

> **tierName**: `string`

Defined in: [types/subscription.ts:929](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L929)

Human-readable tier name

---

### description

> **description**: `string`

Defined in: [types/subscription.ts:931](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L931)

Human-readable tier description

---

### messagesPerDay

> **messagesPerDay**: `number` \| `"unlimited"`

Defined in: [types/subscription.ts:933](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L933)

Messages allowed per day (-1 for unlimited)

---

### contextWindow

> **contextWindow**: `number`

Defined in: [types/subscription.ts:935](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L935)

Maximum context window size in tokens

---

### priorityAccess

> **priorityAccess**: `boolean`

Defined in: [types/subscription.ts:937](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L937)

Whether the user has priority access

---

### isActive

> **isActive**: `boolean`

Defined in: [types/subscription.ts:939](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L939)

Whether the subscription is active

---

### expiresAt?

> `optional` **expiresAt?**: `number`

Defined in: [types/subscription.ts:941](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L941)

Subscription expiration date (if applicable)

---

### usage?

> `optional` **usage?**: [`ClaudeUsageInfo`](ClaudeUsageInfo.md)

Defined in: [types/subscription.ts:943](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L943)

Current usage information

---

### features?

> `optional` **features?**: [`SubscriptionFeatures`](SubscriptionFeatures.md)

Defined in: [types/subscription.ts:945](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L945)

Available features for this tier
