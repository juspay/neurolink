[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SubscriptionInfo

# Type Alias: SubscriptionInfo

> **SubscriptionInfo** = `object`

Defined in: [types/subscription.ts:302](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L302)

Subscription information for Claude API access

## Description

Contains subscription tier and related metadata
for providers that support subscription-based access

## Properties

### tier

> **tier**: [`ClaudeSubscriptionTier`](ClaudeSubscriptionTier.md)

Defined in: [types/subscription.ts:306](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L306)

The subscription tier

---

### isActive

> **isActive**: `boolean`

Defined in: [types/subscription.ts:311](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L311)

Whether the subscription is active

---

### startDate?

> `optional` **startDate?**: `string`

Defined in: [types/subscription.ts:316](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L316)

Subscription start date (ISO 8601 timestamp)

---

### renewalDate?

> `optional` **renewalDate?**: `string`

Defined in: [types/subscription.ts:321](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L321)

Subscription renewal date (ISO 8601 timestamp)

---

### rateLimit?

> `optional` **rateLimit?**: [`AnthropicRateLimitInfo`](AnthropicRateLimitInfo.md)

Defined in: [types/subscription.ts:326](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L326)

Current rate limit information

---

### features?

> `optional` **features?**: [`SubscriptionFeatures`](SubscriptionFeatures.md)

Defined in: [types/subscription.ts:331](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L331)

Features available with this subscription
