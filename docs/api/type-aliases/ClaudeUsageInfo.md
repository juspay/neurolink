[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClaudeUsageInfo

# Type Alias: ClaudeUsageInfo

> **ClaudeUsageInfo** = `object`

Defined in: [types/subscription.ts:412](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L412)

Claude usage information for tracking current consumption

## Description

Represents the current usage state within a billing period,
tracking messages sent, tokens consumed, and remaining quotas.

## Properties

### messagesUsed

> **messagesUsed**: `number`

Defined in: [types/subscription.ts:417](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L417)

Messages sent in current period

#### Description

Count of messages sent since last quota reset

---

### messagesRemaining

> **messagesRemaining**: `number`

Defined in: [types/subscription.ts:423](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L423)

Messages remaining in current period

#### Description

Calculated as maxMessagesPerPeriod - messagesUsed

---

### tokensUsed

> **tokensUsed**: `number`

Defined in: [types/subscription.ts:429](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L429)

Tokens consumed in current period

#### Description

Total tokens (input + output) used since last reset

---

### tokensRemaining

> **tokensRemaining**: `number`

Defined in: [types/subscription.ts:435](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L435)

Tokens remaining in current period

#### Description

Calculated as maxTokensPerPeriod - tokensUsed

---

### inputTokensUsed

> **inputTokensUsed**: `number`

Defined in: [types/subscription.ts:441](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L441)

Input tokens consumed in current period

#### Description

Prompt/input tokens used since last reset

---

### outputTokensUsed

> **outputTokensUsed**: `number`

Defined in: [types/subscription.ts:447](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L447)

Output tokens consumed in current period

#### Description

Response/output tokens used since last reset

---

### lastRequestTimestamp

> **lastRequestTimestamp**: `number`

Defined in: [types/subscription.ts:453](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L453)

Timestamp of last API request (Unix epoch in milliseconds)

#### Description

When the last successful request was made

---

### isRateLimited

> **isRateLimited**: `boolean`

Defined in: [types/subscription.ts:459](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L459)

Current rate limit status

#### Description

Whether the user is currently rate limited

---

### rateLimitExpiresAt?

> `optional` **rateLimitExpiresAt?**: `number`

Defined in: [types/subscription.ts:465](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L465)

Timestamp when rate limit expires (Unix epoch in milliseconds)

#### Description

When rate limiting will be lifted, if applicable

---

### requestCount

> **requestCount**: `number`

Defined in: [types/subscription.ts:471](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L471)

Total requests made in current period

#### Description

Count of all API requests since last reset

---

### messageQuotaPercent

> **messageQuotaPercent**: `number`

Defined in: [types/subscription.ts:477](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L477)

Usage percentage of message quota

#### Description

Percentage of message quota consumed (0-100)

---

### tokenQuotaPercent

> **tokenQuotaPercent**: `number`

Defined in: [types/subscription.ts:483](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L483)

Usage percentage of token quota

#### Description

Percentage of token quota consumed (0-100)
