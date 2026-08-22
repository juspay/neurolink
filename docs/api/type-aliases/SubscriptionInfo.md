[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SubscriptionInfo

# Type Alias: SubscriptionInfo

> **SubscriptionInfo** = `object`

Defined in: [types/subscription.ts:301](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L301)

Subscription information for Claude API access

## Description

Contains subscription tier and related metadata
for providers that support subscription-based access

## Properties

### tier

> **tier**: [`ClaudeSubscriptionTier`](ClaudeSubscriptionTier.md)

Defined in: [types/subscription.ts:305](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L305)

The subscription tier

---

### isActive

> **isActive**: `boolean`

Defined in: [types/subscription.ts:310](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L310)

Whether the subscription is active

---

### startDate?

> `optional` **startDate?**: `string`

Defined in: [types/subscription.ts:315](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L315)

Subscription start date (ISO 8601 timestamp)

---

### renewalDate?

> `optional` **renewalDate?**: `string`

Defined in: [types/subscription.ts:320](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L320)

Subscription renewal date (ISO 8601 timestamp)

---

### rateLimit?

> `optional` **rateLimit?**: [`AnthropicRateLimitInfo`](AnthropicRateLimitInfo.md)

Defined in: [types/subscription.ts:325](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L325)

Current rate limit information

---

### features?

> `optional` **features?**: [`SubscriptionFeatures`](SubscriptionFeatures.md)

Defined in: [types/subscription.ts:330](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L330)

Features available with this subscription
