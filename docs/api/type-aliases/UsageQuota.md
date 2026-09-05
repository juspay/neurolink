[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / UsageQuota

# Type Alias: UsageQuota

> **UsageQuota** = `object`

Defined in: [types/subscription.ts:748](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L748)

Usage quota for tracking Claude subscription usage

## Description

Simplified quota tracking structure for monitoring
subscription usage against limits. Used for real-time quota monitoring.

## Properties

### tier

> **tier**: [`ClaudeSubscriptionTier`](ClaudeSubscriptionTier.md)

Defined in: [types/subscription.ts:752](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L752)

Current subscription tier

---

### dailyTokensUsed

> **dailyTokensUsed**: `number`

Defined in: [types/subscription.ts:757](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L757)

Daily tokens used in current period

---

### dailyTokensLimit

> **dailyTokensLimit**: `number`

Defined in: [types/subscription.ts:762](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L762)

Daily token limit for current tier

---

### messagesUsed

> **messagesUsed**: `number`

Defined in: [types/subscription.ts:767](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L767)

Messages used in current period

---

### messagesLimit

> **messagesLimit**: `number`

Defined in: [types/subscription.ts:772](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L772)

Message limit for current tier

---

### resetTime

> **resetTime**: `Date`

Defined in: [types/subscription.ts:777](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L777)

Time when usage counters will reset

---

### requestsUsed?

> `optional` **requestsUsed?**: `number`

Defined in: [types/subscription.ts:782](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L782)

Current requests used in rate limit window

---

### requestsLimit?

> `optional` **requestsLimit?**: `number`

Defined in: [types/subscription.ts:787](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L787)

Request limit for rate limit window

---

### isExceeded?

> `optional` **isExceeded?**: `boolean`

Defined in: [types/subscription.ts:792](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L792)

Whether quota is currently exceeded

---

### usagePercent?

> `optional` **usagePercent?**: `number`

Defined in: [types/subscription.ts:797](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L797)

Percentage of quota used (0-100)
