[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / UsageQuota

# Type Alias: UsageQuota

> **UsageQuota** = `object`

Defined in: [types/subscription.ts:665](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L665)

Usage quota for tracking Claude subscription usage

## Description

Simplified quota tracking structure for monitoring
subscription usage against limits. Used for real-time quota monitoring.

## Properties

### tier

> **tier**: [`ClaudeSubscriptionTier`](ClaudeSubscriptionTier.md)

Defined in: [types/subscription.ts:669](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L669)

Current subscription tier

---

### dailyTokensUsed

> **dailyTokensUsed**: `number`

Defined in: [types/subscription.ts:674](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L674)

Daily tokens used in current period

---

### dailyTokensLimit

> **dailyTokensLimit**: `number`

Defined in: [types/subscription.ts:679](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L679)

Daily token limit for current tier

---

### messagesUsed

> **messagesUsed**: `number`

Defined in: [types/subscription.ts:684](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L684)

Messages used in current period

---

### messagesLimit

> **messagesLimit**: `number`

Defined in: [types/subscription.ts:689](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L689)

Message limit for current tier

---

### resetTime

> **resetTime**: `Date`

Defined in: [types/subscription.ts:694](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L694)

Time when usage counters will reset

---

### requestsUsed?

> `optional` **requestsUsed?**: `number`

Defined in: [types/subscription.ts:699](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L699)

Current requests used in rate limit window

---

### requestsLimit?

> `optional` **requestsLimit?**: `number`

Defined in: [types/subscription.ts:704](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L704)

Request limit for rate limit window

---

### isExceeded?

> `optional` **isExceeded?**: `boolean`

Defined in: [types/subscription.ts:709](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L709)

Whether quota is currently exceeded

---

### usagePercent?

> `optional` **usagePercent?**: `number`

Defined in: [types/subscription.ts:714](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L714)

Percentage of quota used (0-100)
