[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClaudeQuotaInfo

# Type Alias: ClaudeQuotaInfo

> **ClaudeQuotaInfo** = `object`

Defined in: [types/subscription.ts:261](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L261)

Claude quota information for tracking usage limits

## Description

Represents the quota limits for a Claude subscription,
including message limits, token limits, and model access restrictions.

## Properties

### maxMessagesPerPeriod

> **maxMessagesPerPeriod**: `number`

Defined in: [types/subscription.ts:266](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L266)

Maximum messages allowed per time period

#### Description

Number of messages the user can send within the reset period

---

### maxTokensPerPeriod

> **maxTokensPerPeriod**: `number`

Defined in: [types/subscription.ts:272](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L272)

Maximum tokens allowed per time period

#### Description

Total tokens (input + output) allowed within the reset period

---

### maxTokensPerRequest

> **maxTokensPerRequest**: `number`

Defined in: [types/subscription.ts:278](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L278)

Maximum tokens per individual request

#### Description

Limit on tokens for a single API request

---

### resetPeriodMs

> **resetPeriodMs**: `number`

Defined in: [types/subscription.ts:284](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L284)

Time period for quota reset in milliseconds

#### Description

Duration after which quota counters reset (e.g., 3600000 for 1 hour)

---

### nextResetTimestamp

> **nextResetTimestamp**: `number`

Defined in: [types/subscription.ts:290](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L290)

Timestamp when quota will reset (Unix epoch in milliseconds)

#### Description

Next quota reset time

---

### availableModels

> **availableModels**: `string`[]

Defined in: [types/subscription.ts:296](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L296)

List of models accessible with current subscription

#### Description

Model identifiers the user has access to based on tier

---

### hasPriorityAccess

> **hasPriorityAccess**: `boolean`

Defined in: [types/subscription.ts:302](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L302)

Whether priority queue access is enabled

#### Description

Priority access reduces wait times during high traffic

---

### maxConcurrentRequests

> **maxConcurrentRequests**: `number`

Defined in: [types/subscription.ts:308](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L308)

Maximum concurrent requests allowed

#### Description

Number of simultaneous API requests permitted

---

### hasExtendedThinking

> **hasExtendedThinking**: `boolean`

Defined in: [types/subscription.ts:314](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L314)

Whether extended thinking is available

#### Description

Access to extended thinking/reasoning capabilities

---

### maxContextWindow

> **maxContextWindow**: `number`

Defined in: [types/subscription.ts:320](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L320)

Maximum context window size in tokens

#### Description

Maximum context length supported for the subscription tier
