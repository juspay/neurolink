[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClaudeQuotaInfo

# Type Alias: ClaudeQuotaInfo

> **ClaudeQuotaInfo** = `object`

Claude quota information for tracking usage limits

## Description

Represents the quota limits for a Claude subscription,
including message limits, token limits, and model access restrictions.

## Properties

### maxMessagesPerPeriod

> **maxMessagesPerPeriod**: `number`

Maximum messages allowed per time period

#### Description

Number of messages the user can send within the reset period

---

### maxTokensPerPeriod

> **maxTokensPerPeriod**: `number`

Maximum tokens allowed per time period

#### Description

Total tokens (input + output) allowed within the reset period

---

### maxTokensPerRequest

> **maxTokensPerRequest**: `number`

Maximum tokens per individual request

#### Description

Limit on tokens for a single API request

---

### resetPeriodMs

> **resetPeriodMs**: `number`

Time period for quota reset in milliseconds

#### Description

Duration after which quota counters reset (e.g., 3600000 for 1 hour)

---

### nextResetTimestamp

> **nextResetTimestamp**: `number`

Timestamp when quota will reset (Unix epoch in milliseconds)

#### Description

Next quota reset time

---

### availableModels

> **availableModels**: `string`[]

List of models accessible with current subscription

#### Description

Model identifiers the user has access to based on tier

---

### hasPriorityAccess

> **hasPriorityAccess**: `boolean`

Whether priority queue access is enabled

#### Description

Priority access reduces wait times during high traffic

---

### maxConcurrentRequests

> **maxConcurrentRequests**: `number`

Maximum concurrent requests allowed

#### Description

Number of simultaneous API requests permitted

---

### hasExtendedThinking

> **hasExtendedThinking**: `boolean`

Whether extended thinking is available

#### Description

Access to extended thinking/reasoning capabilities

---

### maxContextWindow

> **maxContextWindow**: `number`

Maximum context window size in tokens

#### Description

Maximum context length supported for the subscription tier
