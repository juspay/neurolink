[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / UsageQuota

# Type Alias: UsageQuota

> **UsageQuota** = `object`

Usage quota for tracking Claude subscription usage

## Description

Simplified quota tracking structure for monitoring
subscription usage against limits. Used for real-time quota monitoring.

## Properties

### tier

> **tier**: [`ClaudeSubscriptionTier`](ClaudeSubscriptionTier.md)

Current subscription tier

---

### dailyTokensUsed

> **dailyTokensUsed**: `number`

Daily tokens used in current period

---

### dailyTokensLimit

> **dailyTokensLimit**: `number`

Daily token limit for current tier

---

### messagesUsed

> **messagesUsed**: `number`

Messages used in current period

---

### messagesLimit

> **messagesLimit**: `number`

Message limit for current tier

---

### resetTime

> **resetTime**: `Date`

Time when usage counters will reset

---

### requestsUsed?

> `optional` **requestsUsed?**: `number`

Current requests used in rate limit window

---

### requestsLimit?

> `optional` **requestsLimit?**: `number`

Request limit for rate limit window

---

### isExceeded?

> `optional` **isExceeded?**: `boolean`

Whether quota is currently exceeded

---

### usagePercent?

> `optional` **usagePercent?**: `number`

Percentage of quota used (0-100)
