[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClaudeUsageInfo

# Type Alias: ClaudeUsageInfo

> **ClaudeUsageInfo** = `object`

Defined in: [types/subscription.ts:411](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/subscription.ts#L411)

Claude usage information for tracking current consumption

## Description

Represents the current usage state within a billing period,
tracking messages sent, tokens consumed, and remaining quotas.

## Properties

### messagesUsed

> **messagesUsed**: `number`

Defined in: [types/subscription.ts:416](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/subscription.ts#L416)

Messages sent in current period

#### Description

Count of messages sent since last quota reset

---

### messagesRemaining

> **messagesRemaining**: `number`

Defined in: [types/subscription.ts:422](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/subscription.ts#L422)

Messages remaining in current period

#### Description

Calculated as maxMessagesPerPeriod - messagesUsed

---

### tokensUsed

> **tokensUsed**: `number`

Defined in: [types/subscription.ts:428](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/subscription.ts#L428)

Tokens consumed in current period

#### Description

Total tokens (input + output) used since last reset

---

### tokensRemaining

> **tokensRemaining**: `number`

Defined in: [types/subscription.ts:434](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/subscription.ts#L434)

Tokens remaining in current period

#### Description

Calculated as maxTokensPerPeriod - tokensUsed

---

### inputTokensUsed

> **inputTokensUsed**: `number`

Defined in: [types/subscription.ts:440](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/subscription.ts#L440)

Input tokens consumed in current period

#### Description

Prompt/input tokens used since last reset

---

### outputTokensUsed

> **outputTokensUsed**: `number`

Defined in: [types/subscription.ts:446](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/subscription.ts#L446)

Output tokens consumed in current period

#### Description

Response/output tokens used since last reset

---

### lastRequestTimestamp

> **lastRequestTimestamp**: `number`

Defined in: [types/subscription.ts:452](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/subscription.ts#L452)

Timestamp of last API request (Unix epoch in milliseconds)

#### Description

When the last successful request was made

---

### isRateLimited

> **isRateLimited**: `boolean`

Defined in: [types/subscription.ts:458](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/subscription.ts#L458)

Current rate limit status

#### Description

Whether the user is currently rate limited

---

### rateLimitExpiresAt?

> `optional` **rateLimitExpiresAt?**: `number`

Defined in: [types/subscription.ts:464](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/subscription.ts#L464)

Timestamp when rate limit expires (Unix epoch in milliseconds)

#### Description

When rate limiting will be lifted, if applicable

---

### requestCount

> **requestCount**: `number`

Defined in: [types/subscription.ts:470](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/subscription.ts#L470)

Total requests made in current period

#### Description

Count of all API requests since last reset

---

### messageQuotaPercent

> **messageQuotaPercent**: `number`

Defined in: [types/subscription.ts:476](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/subscription.ts#L476)

Usage percentage of message quota

#### Description

Percentage of message quota consumed (0-100)

---

### tokenQuotaPercent

> **tokenQuotaPercent**: `number`

Defined in: [types/subscription.ts:482](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/subscription.ts#L482)

Usage percentage of token quota

#### Description

Percentage of token quota consumed (0-100)
