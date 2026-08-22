[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClaudeQuotaInfo

# Type Alias: ClaudeQuotaInfo

> **ClaudeQuotaInfo** = `object`

Defined in: [types/subscription.ts:343](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L343)

Claude quota information for tracking usage limits

## Description

Represents the quota limits for a Claude subscription,
including message limits, token limits, and model access restrictions.

## Properties

### maxMessagesPerPeriod

> **maxMessagesPerPeriod**: `number`

Defined in: [types/subscription.ts:348](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L348)

Maximum messages allowed per time period

#### Description

Number of messages the user can send within the reset period

---

### maxTokensPerPeriod

> **maxTokensPerPeriod**: `number`

Defined in: [types/subscription.ts:354](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L354)

Maximum tokens allowed per time period

#### Description

Total tokens (input + output) allowed within the reset period

---

### maxTokensPerRequest

> **maxTokensPerRequest**: `number`

Defined in: [types/subscription.ts:360](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L360)

Maximum tokens per individual request

#### Description

Limit on tokens for a single API request

---

### resetPeriodMs

> **resetPeriodMs**: `number`

Defined in: [types/subscription.ts:366](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L366)

Time period for quota reset in milliseconds

#### Description

Duration after which quota counters reset (e.g., 3600000 for 1 hour)

---

### nextResetTimestamp

> **nextResetTimestamp**: `number`

Defined in: [types/subscription.ts:372](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L372)

Timestamp when quota will reset (Unix epoch in milliseconds)

#### Description

Next quota reset time

---

### availableModels

> **availableModels**: `string`[]

Defined in: [types/subscription.ts:378](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L378)

List of models accessible with current subscription

#### Description

Model identifiers the user has access to based on tier

---

### hasPriorityAccess

> **hasPriorityAccess**: `boolean`

Defined in: [types/subscription.ts:384](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L384)

Whether priority queue access is enabled

#### Description

Priority access reduces wait times during high traffic

---

### maxConcurrentRequests

> **maxConcurrentRequests**: `number`

Defined in: [types/subscription.ts:390](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L390)

Maximum concurrent requests allowed

#### Description

Number of simultaneous API requests permitted

---

### hasExtendedThinking

> **hasExtendedThinking**: `boolean`

Defined in: [types/subscription.ts:396](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L396)

Whether extended thinking is available

#### Description

Access to extended thinking/reasoning capabilities

---

### maxContextWindow

> **maxContextWindow**: `number`

Defined in: [types/subscription.ts:402](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L402)

Maximum context window size in tokens

#### Description

Maximum context length supported for the subscription tier
