[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SubscriptionInfo

# Type Alias: SubscriptionInfo

> **SubscriptionInfo** = `object`

Defined in: [types/subscription.ts:303](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L303)

Subscription information for Claude API access

## Description

Contains subscription tier and related metadata
for providers that support subscription-based access

## Properties

### tier

> **tier**: [`ClaudeSubscriptionTier`](ClaudeSubscriptionTier.md)

Defined in: [types/subscription.ts:307](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L307)

The subscription tier

---

### isActive

> **isActive**: `boolean`

Defined in: [types/subscription.ts:312](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L312)

Whether the subscription is active

---

### startDate?

> `optional` **startDate?**: `string`

Defined in: [types/subscription.ts:317](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L317)

Subscription start date (ISO 8601 timestamp)

---

### renewalDate?

> `optional` **renewalDate?**: `string`

Defined in: [types/subscription.ts:322](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L322)

Subscription renewal date (ISO 8601 timestamp)

---

### rateLimit?

> `optional` **rateLimit?**: [`AnthropicRateLimitInfo`](AnthropicRateLimitInfo.md)

Defined in: [types/subscription.ts:327](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L327)

Current rate limit information

---

### features?

> `optional` **features?**: [`SubscriptionFeatures`](SubscriptionFeatures.md)

Defined in: [types/subscription.ts:332](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L332)

Features available with this subscription
