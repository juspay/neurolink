[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClaudeUsageInfo

# Type Alias: ClaudeUsageInfo

> **ClaudeUsageInfo** = `object`

Defined in: [types/subscription.ts:329](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L329)

Claude usage information for tracking current consumption

## Description

Represents the current usage state within a billing period,
tracking messages sent, tokens consumed, and remaining quotas.

## Properties

### messagesUsed

> **messagesUsed**: `number`

Defined in: [types/subscription.ts:334](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L334)

Messages sent in current period

#### Description

Count of messages sent since last quota reset

---

### messagesRemaining

> **messagesRemaining**: `number`

Defined in: [types/subscription.ts:340](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L340)

Messages remaining in current period

#### Description

Calculated as maxMessagesPerPeriod - messagesUsed

---

### tokensUsed

> **tokensUsed**: `number`

Defined in: [types/subscription.ts:346](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L346)

Tokens consumed in current period

#### Description

Total tokens (input + output) used since last reset

---

### tokensRemaining

> **tokensRemaining**: `number`

Defined in: [types/subscription.ts:352](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L352)

Tokens remaining in current period

#### Description

Calculated as maxTokensPerPeriod - tokensUsed

---

### inputTokensUsed

> **inputTokensUsed**: `number`

Defined in: [types/subscription.ts:358](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L358)

Input tokens consumed in current period

#### Description

Prompt/input tokens used since last reset

---

### outputTokensUsed

> **outputTokensUsed**: `number`

Defined in: [types/subscription.ts:364](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L364)

Output tokens consumed in current period

#### Description

Response/output tokens used since last reset

---

### lastRequestTimestamp

> **lastRequestTimestamp**: `number`

Defined in: [types/subscription.ts:370](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L370)

Timestamp of last API request (Unix epoch in milliseconds)

#### Description

When the last successful request was made

---

### isRateLimited

> **isRateLimited**: `boolean`

Defined in: [types/subscription.ts:376](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L376)

Current rate limit status

#### Description

Whether the user is currently rate limited

---

### rateLimitExpiresAt?

> `optional` **rateLimitExpiresAt?**: `number`

Defined in: [types/subscription.ts:382](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L382)

Timestamp when rate limit expires (Unix epoch in milliseconds)

#### Description

When rate limiting will be lifted, if applicable

---

### requestCount

> **requestCount**: `number`

Defined in: [types/subscription.ts:388](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L388)

Total requests made in current period

#### Description

Count of all API requests since last reset

---

### messageQuotaPercent

> **messageQuotaPercent**: `number`

Defined in: [types/subscription.ts:394](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L394)

Usage percentage of message quota

#### Description

Percentage of message quota consumed (0-100)

---

### tokenQuotaPercent

> **tokenQuotaPercent**: `number`

Defined in: [types/subscription.ts:400](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L400)

Usage percentage of token quota

#### Description

Percentage of token quota consumed (0-100)
