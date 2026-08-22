[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / UsageQuota

# Type Alias: UsageQuota

> **UsageQuota** = `object`

Defined in: [types/subscription.ts:747](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L747)

Usage quota for tracking Claude subscription usage

## Description

Simplified quota tracking structure for monitoring
subscription usage against limits. Used for real-time quota monitoring.

## Properties

### tier

> **tier**: [`ClaudeSubscriptionTier`](ClaudeSubscriptionTier.md)

Defined in: [types/subscription.ts:751](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L751)

Current subscription tier

---

### dailyTokensUsed

> **dailyTokensUsed**: `number`

Defined in: [types/subscription.ts:756](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L756)

Daily tokens used in current period

---

### dailyTokensLimit

> **dailyTokensLimit**: `number`

Defined in: [types/subscription.ts:761](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L761)

Daily token limit for current tier

---

### messagesUsed

> **messagesUsed**: `number`

Defined in: [types/subscription.ts:766](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L766)

Messages used in current period

---

### messagesLimit

> **messagesLimit**: `number`

Defined in: [types/subscription.ts:771](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L771)

Message limit for current tier

---

### resetTime

> **resetTime**: `Date`

Defined in: [types/subscription.ts:776](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L776)

Time when usage counters will reset

---

### requestsUsed?

> `optional` **requestsUsed?**: `number`

Defined in: [types/subscription.ts:781](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L781)

Current requests used in rate limit window

---

### requestsLimit?

> `optional` **requestsLimit?**: `number`

Defined in: [types/subscription.ts:786](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L786)

Request limit for rate limit window

---

### isExceeded?

> `optional` **isExceeded?**: `boolean`

Defined in: [types/subscription.ts:791](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L791)

Whether quota is currently exceeded

---

### usagePercent?

> `optional` **usagePercent?**: `number`

Defined in: [types/subscription.ts:796](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L796)

Percentage of quota used (0-100)
