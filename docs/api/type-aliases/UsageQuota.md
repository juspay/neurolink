[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / UsageQuota

# Type Alias: UsageQuota

> **UsageQuota** = `object`

Defined in: [types/subscription.ts:749](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L749)

Usage quota for tracking Claude subscription usage

## Description

Simplified quota tracking structure for monitoring
subscription usage against limits. Used for real-time quota monitoring.

## Properties

### tier

> **tier**: [`ClaudeSubscriptionTier`](ClaudeSubscriptionTier.md)

Defined in: [types/subscription.ts:753](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L753)

Current subscription tier

---

### dailyTokensUsed

> **dailyTokensUsed**: `number`

Defined in: [types/subscription.ts:758](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L758)

Daily tokens used in current period

---

### dailyTokensLimit

> **dailyTokensLimit**: `number`

Defined in: [types/subscription.ts:763](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L763)

Daily token limit for current tier

---

### messagesUsed

> **messagesUsed**: `number`

Defined in: [types/subscription.ts:768](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L768)

Messages used in current period

---

### messagesLimit

> **messagesLimit**: `number`

Defined in: [types/subscription.ts:773](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L773)

Message limit for current tier

---

### resetTime

> **resetTime**: `Date`

Defined in: [types/subscription.ts:778](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L778)

Time when usage counters will reset

---

### requestsUsed?

> `optional` **requestsUsed?**: `number`

Defined in: [types/subscription.ts:783](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L783)

Current requests used in rate limit window

---

### requestsLimit?

> `optional` **requestsLimit?**: `number`

Defined in: [types/subscription.ts:788](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L788)

Request limit for rate limit window

---

### isExceeded?

> `optional` **isExceeded?**: `boolean`

Defined in: [types/subscription.ts:793](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L793)

Whether quota is currently exceeded

---

### usagePercent?

> `optional` **usagePercent?**: `number`

Defined in: [types/subscription.ts:798](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L798)

Percentage of quota used (0-100)
