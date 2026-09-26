[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SubscriptionInfo

# Type Alias: SubscriptionInfo

> **SubscriptionInfo** = `object`

Subscription information for Claude API access

## Description

Contains subscription tier and related metadata
for providers that support subscription-based access

## Properties

### tier

> **tier**: [`ClaudeSubscriptionTier`](ClaudeSubscriptionTier.md)

The subscription tier

---

### isActive

> **isActive**: `boolean`

Whether the subscription is active

---

### startDate?

> `optional` **startDate?**: `string`

Subscription start date (ISO 8601 timestamp)

---

### renewalDate?

> `optional` **renewalDate?**: `string`

Subscription renewal date (ISO 8601 timestamp)

---

### rateLimit?

> `optional` **rateLimit?**: [`AnthropicRateLimitInfo`](AnthropicRateLimitInfo.md)

Current rate limit information

---

### features?

> `optional` **features?**: [`SubscriptionFeatures`](SubscriptionFeatures.md)

Features available with this subscription
