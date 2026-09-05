[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SubscriptionFeatures

# Type Alias: SubscriptionFeatures

> **SubscriptionFeatures** = `object`

Defined in: [types/subscription.ts:497](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L497)

Subscription features defining capabilities per tier

## Description

Defines what features and capabilities are available
for each subscription tier. Used to determine access to specific
functionality and feature gating.

## Properties

### tier

> **tier**: [`ClaudeSubscriptionTier`](ClaudeSubscriptionTier.md)

Defined in: [types/subscription.ts:501](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L501)

Subscription tier this feature set belongs to

---

### hasChat

> **hasChat**: `boolean`

Defined in: [types/subscription.ts:507](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L507)

Whether chat/conversation access is enabled

#### Description

Basic chat functionality with Claude

---

### hasApiAccess

> **hasApiAccess**: `boolean`

Defined in: [types/subscription.ts:513](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L513)

Whether API access is enabled

#### Description

Programmatic access to Claude via API

---

### hasExtendedThinking

> **hasExtendedThinking**: `boolean`

Defined in: [types/subscription.ts:519](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L519)

Whether extended thinking/reasoning is enabled

#### Description

Access to extended thinking capabilities for complex reasoning

---

### hasPriorityAccess

> **hasPriorityAccess**: `boolean`

Defined in: [types/subscription.ts:525](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L525)

Whether priority queue access is enabled

#### Description

Faster response times during high traffic periods

---

### hasVision

> **hasVision**: `boolean`

Defined in: [types/subscription.ts:531](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L531)

Whether vision/image analysis is enabled

#### Description

Ability to analyze images and visual content

---

### hasFileAnalysis

> **hasFileAnalysis**: `boolean`

Defined in: [types/subscription.ts:537](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L537)

Whether file/document analysis is enabled

#### Description

Ability to process PDFs, documents, and other files

---

### hasCodeExecution

> **hasCodeExecution**: `boolean`

Defined in: [types/subscription.ts:543](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L543)

Whether code execution is enabled

#### Description

Access to code execution/analysis features

---

### hasMcpTools

> **hasMcpTools**: `boolean`

Defined in: [types/subscription.ts:549](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L549)

Whether MCP (Model Context Protocol) tools are enabled

#### Description

Access to external tool integrations via MCP

---

### hasComputerUse

> **hasComputerUse**: `boolean`

Defined in: [types/subscription.ts:555](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L555)

Whether computer use capability is enabled

#### Description

Access to computer use/automation features

---

### hasWebSearch

> **hasWebSearch**: `boolean`

Defined in: [types/subscription.ts:561](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L561)

Whether web search is enabled

#### Description

Access to web search capabilities

---

### maxContextWindow

> **maxContextWindow**: `number`

Defined in: [types/subscription.ts:567](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L567)

Maximum context window size in tokens

#### Description

Limit on context/conversation length

---

### maxOutputTokens

> **maxOutputTokens**: `number`

Defined in: [types/subscription.ts:573](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L573)

Maximum output tokens per request

#### Description

Limit on response length per request

---

### availableModels

> **availableModels**: `string`[]

Defined in: [types/subscription.ts:579](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L579)

List of accessible model identifiers

#### Description

Which Claude models are available for this tier

---

### dailyMessageLimit

> **dailyMessageLimit**: `number`

Defined in: [types/subscription.ts:585](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L585)

Daily message limit

#### Description

Maximum messages per day, -1 for unlimited

---

### monthlyTokenLimit

> **monthlyTokenLimit**: `number`

Defined in: [types/subscription.ts:591](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L591)

Monthly token limit

#### Description

Maximum tokens per month, -1 for unlimited

---

### hasUsageAnalytics

> **hasUsageAnalytics**: `boolean`

Defined in: [types/subscription.ts:597](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L597)

Whether usage analytics are available

#### Description

Access to detailed usage statistics and analytics

---

### hasTeamFeatures

> **hasTeamFeatures**: `boolean`

Defined in: [types/subscription.ts:603](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L603)

Whether team/organization features are enabled

#### Description

Access to team management and collaboration features

---

### customFeatures?

> `optional` **customFeatures?**: `Record`\<`string`, `boolean`\>

Defined in: [types/subscription.ts:609](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L609)

Custom feature flags for extensibility

#### Description

Additional feature flags for future capabilities
