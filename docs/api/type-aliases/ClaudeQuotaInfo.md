[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClaudeQuotaInfo

# Type Alias: ClaudeQuotaInfo

> **ClaudeQuotaInfo** = `object`

Defined in: [types/subscription.ts:344](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L344)

Claude quota information for tracking usage limits

## Description

Represents the quota limits for a Claude subscription,
including message limits, token limits, and model access restrictions.

## Properties

### maxMessagesPerPeriod

> **maxMessagesPerPeriod**: `number`

Defined in: [types/subscription.ts:349](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L349)

Maximum messages allowed per time period

#### Description

Number of messages the user can send within the reset period

---

### maxTokensPerPeriod

> **maxTokensPerPeriod**: `number`

Defined in: [types/subscription.ts:355](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L355)

Maximum tokens allowed per time period

#### Description

Total tokens (input + output) allowed within the reset period

---

### maxTokensPerRequest

> **maxTokensPerRequest**: `number`

Defined in: [types/subscription.ts:361](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L361)

Maximum tokens per individual request

#### Description

Limit on tokens for a single API request

---

### resetPeriodMs

> **resetPeriodMs**: `number`

Defined in: [types/subscription.ts:367](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L367)

Time period for quota reset in milliseconds

#### Description

Duration after which quota counters reset (e.g., 3600000 for 1 hour)

---

### nextResetTimestamp

> **nextResetTimestamp**: `number`

Defined in: [types/subscription.ts:373](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L373)

Timestamp when quota will reset (Unix epoch in milliseconds)

#### Description

Next quota reset time

---

### availableModels

> **availableModels**: `string`[]

Defined in: [types/subscription.ts:379](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L379)

List of models accessible with current subscription

#### Description

Model identifiers the user has access to based on tier

---

### hasPriorityAccess

> **hasPriorityAccess**: `boolean`

Defined in: [types/subscription.ts:385](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L385)

Whether priority queue access is enabled

#### Description

Priority access reduces wait times during high traffic

---

### maxConcurrentRequests

> **maxConcurrentRequests**: `number`

Defined in: [types/subscription.ts:391](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L391)

Maximum concurrent requests allowed

#### Description

Number of simultaneous API requests permitted

---

### hasExtendedThinking

> **hasExtendedThinking**: `boolean`

Defined in: [types/subscription.ts:397](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L397)

Whether extended thinking is available

#### Description

Access to extended thinking/reasoning capabilities

---

### maxContextWindow

> **maxContextWindow**: `number`

Defined in: [types/subscription.ts:403](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L403)

Maximum context window size in tokens

#### Description

Maximum context length supported for the subscription tier
