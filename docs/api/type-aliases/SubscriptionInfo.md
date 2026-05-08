[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / SubscriptionInfo

# Type Alias: SubscriptionInfo

> **SubscriptionInfo** = `object`

Defined in: [types/subscription.ts:219](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L219)

Subscription information for Claude API access

## Description

Contains subscription tier and related metadata
for providers that support subscription-based access

## Properties

### tier

> **tier**: [`ClaudeSubscriptionTier`](ClaudeSubscriptionTier.md)

Defined in: [types/subscription.ts:223](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L223)

The subscription tier

---

### isActive

> **isActive**: `boolean`

Defined in: [types/subscription.ts:228](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L228)

Whether the subscription is active

---

### startDate?

> `optional` **startDate?**: `string`

Defined in: [types/subscription.ts:233](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L233)

Subscription start date (ISO 8601 timestamp)

---

### renewalDate?

> `optional` **renewalDate?**: `string`

Defined in: [types/subscription.ts:238](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L238)

Subscription renewal date (ISO 8601 timestamp)

---

### rateLimit?

> `optional` **rateLimit?**: [`AnthropicRateLimitInfo`](AnthropicRateLimitInfo.md)

Defined in: [types/subscription.ts:243](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L243)

Current rate limit information

---

### features?

> `optional` **features?**: [`SubscriptionFeatures`](SubscriptionFeatures.md)

Defined in: [types/subscription.ts:248](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L248)

Features available with this subscription
