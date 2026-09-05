[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SubscriptionInfoSummary

# Type Alias: SubscriptionInfoSummary

> **SubscriptionInfoSummary** = `object`

Defined in: [types/subscription.ts:924](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L924)

Subscription information summary for display purposes

## Description

Extended subscription information including human-readable
tier descriptions and usage data. Use for UI display and status reporting.
For basic subscription state, see SubscriptionInfo.

## Properties

### tier

> **tier**: [`ClaudeSubscriptionTier`](ClaudeSubscriptionTier.md)

Defined in: [types/subscription.ts:926](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L926)

Current subscription tier

---

### tierName

> **tierName**: `string`

Defined in: [types/subscription.ts:928](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L928)

Human-readable tier name

---

### description

> **description**: `string`

Defined in: [types/subscription.ts:930](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L930)

Human-readable tier description

---

### messagesPerDay

> **messagesPerDay**: `number` \| `"unlimited"`

Defined in: [types/subscription.ts:932](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L932)

Messages allowed per day (-1 for unlimited)

---

### contextWindow

> **contextWindow**: `number`

Defined in: [types/subscription.ts:934](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L934)

Maximum context window size in tokens

---

### priorityAccess

> **priorityAccess**: `boolean`

Defined in: [types/subscription.ts:936](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L936)

Whether the user has priority access

---

### isActive

> **isActive**: `boolean`

Defined in: [types/subscription.ts:938](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L938)

Whether the subscription is active

---

### expiresAt?

> `optional` **expiresAt?**: `number`

Defined in: [types/subscription.ts:940](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L940)

Subscription expiration date (if applicable)

---

### usage?

> `optional` **usage?**: [`ClaudeUsageInfo`](ClaudeUsageInfo.md)

Defined in: [types/subscription.ts:942](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L942)

Current usage information

---

### features?

> `optional` **features?**: [`SubscriptionFeatures`](SubscriptionFeatures.md)

Defined in: [types/subscription.ts:944](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L944)

Available features for this tier
