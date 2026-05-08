[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / SubscriptionInfoSummary

# Type Alias: SubscriptionInfoSummary

> **SubscriptionInfoSummary** = `object`

Defined in: [types/subscription.ts:841](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L841)

Subscription information summary for display purposes

## Description

Extended subscription information including human-readable
tier descriptions and usage data. Use for UI display and status reporting.
For basic subscription state, see SubscriptionInfo.

## Properties

### tier

> **tier**: [`ClaudeSubscriptionTier`](ClaudeSubscriptionTier.md)

Defined in: [types/subscription.ts:843](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L843)

Current subscription tier

---

### tierName

> **tierName**: `string`

Defined in: [types/subscription.ts:845](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L845)

Human-readable tier name

---

### description

> **description**: `string`

Defined in: [types/subscription.ts:847](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L847)

Human-readable tier description

---

### messagesPerDay

> **messagesPerDay**: `number` \| `"unlimited"`

Defined in: [types/subscription.ts:849](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L849)

Messages allowed per day (-1 for unlimited)

---

### contextWindow

> **contextWindow**: `number`

Defined in: [types/subscription.ts:851](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L851)

Maximum context window size in tokens

---

### priorityAccess

> **priorityAccess**: `boolean`

Defined in: [types/subscription.ts:853](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L853)

Whether the user has priority access

---

### isActive

> **isActive**: `boolean`

Defined in: [types/subscription.ts:855](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L855)

Whether the subscription is active

---

### expiresAt?

> `optional` **expiresAt?**: `number`

Defined in: [types/subscription.ts:857](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L857)

Subscription expiration date (if applicable)

---

### usage?

> `optional` **usage?**: [`ClaudeUsageInfo`](ClaudeUsageInfo.md)

Defined in: [types/subscription.ts:859](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L859)

Current usage information

---

### features?

> `optional` **features?**: [`SubscriptionFeatures`](SubscriptionFeatures.md)

Defined in: [types/subscription.ts:861](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L861)

Available features for this tier
