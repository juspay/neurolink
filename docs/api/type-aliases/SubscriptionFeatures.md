[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / SubscriptionFeatures

# Type Alias: SubscriptionFeatures

> **SubscriptionFeatures** = `object`

Defined in: [types/subscription.ts:496](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/subscription.ts#L496)

Subscription features defining capabilities per tier

## Description

Defines what features and capabilities are available
for each subscription tier. Used to determine access to specific
functionality and feature gating.

## Properties

### tier

> **tier**: [`ClaudeSubscriptionTier`](ClaudeSubscriptionTier.md)

Defined in: [types/subscription.ts:500](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/subscription.ts#L500)

Subscription tier this feature set belongs to

---

### hasChat

> **hasChat**: `boolean`

Defined in: [types/subscription.ts:506](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/subscription.ts#L506)

Whether chat/conversation access is enabled

#### Description

Basic chat functionality with Claude

---

### hasApiAccess

> **hasApiAccess**: `boolean`

Defined in: [types/subscription.ts:512](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/subscription.ts#L512)

Whether API access is enabled

#### Description

Programmatic access to Claude via API

---

### hasExtendedThinking

> **hasExtendedThinking**: `boolean`

Defined in: [types/subscription.ts:518](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/subscription.ts#L518)

Whether extended thinking/reasoning is enabled

#### Description

Access to extended thinking capabilities for complex reasoning

---

### hasPriorityAccess

> **hasPriorityAccess**: `boolean`

Defined in: [types/subscription.ts:524](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/subscription.ts#L524)

Whether priority queue access is enabled

#### Description

Faster response times during high traffic periods

---

### hasVision

> **hasVision**: `boolean`

Defined in: [types/subscription.ts:530](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/subscription.ts#L530)

Whether vision/image analysis is enabled

#### Description

Ability to analyze images and visual content

---

### hasFileAnalysis

> **hasFileAnalysis**: `boolean`

Defined in: [types/subscription.ts:536](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/subscription.ts#L536)

Whether file/document analysis is enabled

#### Description

Ability to process PDFs, documents, and other files

---

### hasCodeExecution

> **hasCodeExecution**: `boolean`

Defined in: [types/subscription.ts:542](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/subscription.ts#L542)

Whether code execution is enabled

#### Description

Access to code execution/analysis features

---

### hasMcpTools

> **hasMcpTools**: `boolean`

Defined in: [types/subscription.ts:548](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/subscription.ts#L548)

Whether MCP (Model Context Protocol) tools are enabled

#### Description

Access to external tool integrations via MCP

---

### hasComputerUse

> **hasComputerUse**: `boolean`

Defined in: [types/subscription.ts:554](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/subscription.ts#L554)

Whether computer use capability is enabled

#### Description

Access to computer use/automation features

---

### hasWebSearch

> **hasWebSearch**: `boolean`

Defined in: [types/subscription.ts:560](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/subscription.ts#L560)

Whether web search is enabled

#### Description

Access to web search capabilities

---

### maxContextWindow

> **maxContextWindow**: `number`

Defined in: [types/subscription.ts:566](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/subscription.ts#L566)

Maximum context window size in tokens

#### Description

Limit on context/conversation length

---

### maxOutputTokens

> **maxOutputTokens**: `number`

Defined in: [types/subscription.ts:572](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/subscription.ts#L572)

Maximum output tokens per request

#### Description

Limit on response length per request

---

### availableModels

> **availableModels**: `string`[]

Defined in: [types/subscription.ts:578](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/subscription.ts#L578)

List of accessible model identifiers

#### Description

Which Claude models are available for this tier

---

### dailyMessageLimit

> **dailyMessageLimit**: `number`

Defined in: [types/subscription.ts:584](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/subscription.ts#L584)

Daily message limit

#### Description

Maximum messages per day, -1 for unlimited

---

### monthlyTokenLimit

> **monthlyTokenLimit**: `number`

Defined in: [types/subscription.ts:590](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/subscription.ts#L590)

Monthly token limit

#### Description

Maximum tokens per month, -1 for unlimited

---

### hasUsageAnalytics

> **hasUsageAnalytics**: `boolean`

Defined in: [types/subscription.ts:596](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/subscription.ts#L596)

Whether usage analytics are available

#### Description

Access to detailed usage statistics and analytics

---

### hasTeamFeatures

> **hasTeamFeatures**: `boolean`

Defined in: [types/subscription.ts:602](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/subscription.ts#L602)

Whether team/organization features are enabled

#### Description

Access to team management and collaboration features

---

### customFeatures?

> `optional` **customFeatures?**: `Record`\<`string`, `boolean`\>

Defined in: [types/subscription.ts:608](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/subscription.ts#L608)

Custom feature flags for extensibility

#### Description

Additional feature flags for future capabilities
