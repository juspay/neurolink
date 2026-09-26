[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SubscriptionInfoSummary

# Type Alias: SubscriptionInfoSummary

> **SubscriptionInfoSummary** = `object`

Subscription information summary for display purposes

## Description

Extended subscription information including human-readable
tier descriptions and usage data. Use for UI display and status reporting.
For basic subscription state, see SubscriptionInfo.

## Properties

### tier

> **tier**: [`ClaudeSubscriptionTier`](ClaudeSubscriptionTier.md)

Current subscription tier

---

### tierName

> **tierName**: `string`

Human-readable tier name

---

### description

> **description**: `string`

Human-readable tier description

---

### messagesPerDay

> **messagesPerDay**: `number` \| `"unlimited"`

Messages allowed per day (-1 for unlimited)

---

### contextWindow

> **contextWindow**: `number`

Maximum context window size in tokens

---

### priorityAccess

> **priorityAccess**: `boolean`

Whether the user has priority access

---

### isActive

> **isActive**: `boolean`

Whether the subscription is active

---

### expiresAt?

> `optional` **expiresAt?**: `number`

Subscription expiration date (if applicable)

---

### usage?

> `optional` **usage?**: [`ClaudeUsageInfo`](ClaudeUsageInfo.md)

Current usage information

---

### features?

> `optional` **features?**: [`SubscriptionFeatures`](SubscriptionFeatures.md)

Available features for this tier
