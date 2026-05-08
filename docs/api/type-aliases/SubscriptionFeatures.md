[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / SubscriptionFeatures

# Type Alias: SubscriptionFeatures

> **SubscriptionFeatures** = `object`

Defined in: [types/subscription.ts:414](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L414)

Subscription features defining capabilities per tier

## Description

Defines what features and capabilities are available
for each subscription tier. Used to determine access to specific
functionality and feature gating.

## Properties

### tier

> **tier**: [`ClaudeSubscriptionTier`](ClaudeSubscriptionTier.md)

Defined in: [types/subscription.ts:418](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L418)

Subscription tier this feature set belongs to

---

### hasChat

> **hasChat**: `boolean`

Defined in: [types/subscription.ts:424](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L424)

Whether chat/conversation access is enabled

#### Description

Basic chat functionality with Claude

---

### hasApiAccess

> **hasApiAccess**: `boolean`

Defined in: [types/subscription.ts:430](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L430)

Whether API access is enabled

#### Description

Programmatic access to Claude via API

---

### hasExtendedThinking

> **hasExtendedThinking**: `boolean`

Defined in: [types/subscription.ts:436](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L436)

Whether extended thinking/reasoning is enabled

#### Description

Access to extended thinking capabilities for complex reasoning

---

### hasPriorityAccess

> **hasPriorityAccess**: `boolean`

Defined in: [types/subscription.ts:442](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L442)

Whether priority queue access is enabled

#### Description

Faster response times during high traffic periods

---

### hasVision

> **hasVision**: `boolean`

Defined in: [types/subscription.ts:448](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L448)

Whether vision/image analysis is enabled

#### Description

Ability to analyze images and visual content

---

### hasFileAnalysis

> **hasFileAnalysis**: `boolean`

Defined in: [types/subscription.ts:454](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L454)

Whether file/document analysis is enabled

#### Description

Ability to process PDFs, documents, and other files

---

### hasCodeExecution

> **hasCodeExecution**: `boolean`

Defined in: [types/subscription.ts:460](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L460)

Whether code execution is enabled

#### Description

Access to code execution/analysis features

---

### hasMcpTools

> **hasMcpTools**: `boolean`

Defined in: [types/subscription.ts:466](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L466)

Whether MCP (Model Context Protocol) tools are enabled

#### Description

Access to external tool integrations via MCP

---

### hasComputerUse

> **hasComputerUse**: `boolean`

Defined in: [types/subscription.ts:472](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L472)

Whether computer use capability is enabled

#### Description

Access to computer use/automation features

---

### hasWebSearch

> **hasWebSearch**: `boolean`

Defined in: [types/subscription.ts:478](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L478)

Whether web search is enabled

#### Description

Access to web search capabilities

---

### maxContextWindow

> **maxContextWindow**: `number`

Defined in: [types/subscription.ts:484](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L484)

Maximum context window size in tokens

#### Description

Limit on context/conversation length

---

### maxOutputTokens

> **maxOutputTokens**: `number`

Defined in: [types/subscription.ts:490](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L490)

Maximum output tokens per request

#### Description

Limit on response length per request

---

### availableModels

> **availableModels**: `string`[]

Defined in: [types/subscription.ts:496](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L496)

List of accessible model identifiers

#### Description

Which Claude models are available for this tier

---

### dailyMessageLimit

> **dailyMessageLimit**: `number`

Defined in: [types/subscription.ts:502](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L502)

Daily message limit

#### Description

Maximum messages per day, -1 for unlimited

---

### monthlyTokenLimit

> **monthlyTokenLimit**: `number`

Defined in: [types/subscription.ts:508](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L508)

Monthly token limit

#### Description

Maximum tokens per month, -1 for unlimited

---

### hasUsageAnalytics

> **hasUsageAnalytics**: `boolean`

Defined in: [types/subscription.ts:514](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L514)

Whether usage analytics are available

#### Description

Access to detailed usage statistics and analytics

---

### hasTeamFeatures

> **hasTeamFeatures**: `boolean`

Defined in: [types/subscription.ts:520](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L520)

Whether team/organization features are enabled

#### Description

Access to team management and collaboration features

---

### customFeatures?

> `optional` **customFeatures?**: `Record`\<`string`, `boolean`\>

Defined in: [types/subscription.ts:526](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L526)

Custom feature flags for extensibility

#### Description

Additional feature flags for future capabilities
