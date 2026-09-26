[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClaudeUsageInfo

# Type Alias: ClaudeUsageInfo

> **ClaudeUsageInfo** = `object`

Claude usage information for tracking current consumption

## Description

Represents the current usage state within a billing period,
tracking messages sent, tokens consumed, and remaining quotas.

## Properties

### messagesUsed

> **messagesUsed**: `number`

Messages sent in current period

#### Description

Count of messages sent since last quota reset

---

### messagesRemaining

> **messagesRemaining**: `number`

Messages remaining in current period

#### Description

Calculated as maxMessagesPerPeriod - messagesUsed

---

### tokensUsed

> **tokensUsed**: `number`

Tokens consumed in current period

#### Description

Total tokens (input + output) used since last reset

---

### tokensRemaining

> **tokensRemaining**: `number`

Tokens remaining in current period

#### Description

Calculated as maxTokensPerPeriod - tokensUsed

---

### inputTokensUsed

> **inputTokensUsed**: `number`

Input tokens consumed in current period

#### Description

Prompt/input tokens used since last reset

---

### outputTokensUsed

> **outputTokensUsed**: `number`

Output tokens consumed in current period

#### Description

Response/output tokens used since last reset

---

### lastRequestTimestamp

> **lastRequestTimestamp**: `number`

Timestamp of last API request (Unix epoch in milliseconds)

#### Description

When the last successful request was made

---

### isRateLimited

> **isRateLimited**: `boolean`

Current rate limit status

#### Description

Whether the user is currently rate limited

---

### rateLimitExpiresAt?

> `optional` **rateLimitExpiresAt?**: `number`

Timestamp when rate limit expires (Unix epoch in milliseconds)

#### Description

When rate limiting will be lifted, if applicable

---

### requestCount

> **requestCount**: `number`

Total requests made in current period

#### Description

Count of all API requests since last reset

---

### messageQuotaPercent

> **messageQuotaPercent**: `number`

Usage percentage of message quota

#### Description

Percentage of message quota consumed (0-100)

---

### tokenQuotaPercent

> **tokenQuotaPercent**: `number`

Usage percentage of token quota

#### Description

Percentage of token quota consumed (0-100)
