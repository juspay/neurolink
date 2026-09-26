[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SubscriptionFeatures

# Type Alias: SubscriptionFeatures

> **SubscriptionFeatures** = `object`

Subscription features defining capabilities per tier

## Description

Defines what features and capabilities are available
for each subscription tier. Used to determine access to specific
functionality and feature gating.

## Properties

### tier

> **tier**: [`ClaudeSubscriptionTier`](ClaudeSubscriptionTier.md)

Subscription tier this feature set belongs to

---

### hasChat

> **hasChat**: `boolean`

Whether chat/conversation access is enabled

#### Description

Basic chat functionality with Claude

---

### hasApiAccess

> **hasApiAccess**: `boolean`

Whether API access is enabled

#### Description

Programmatic access to Claude via API

---

### hasExtendedThinking

> **hasExtendedThinking**: `boolean`

Whether extended thinking/reasoning is enabled

#### Description

Access to extended thinking capabilities for complex reasoning

---

### hasPriorityAccess

> **hasPriorityAccess**: `boolean`

Whether priority queue access is enabled

#### Description

Faster response times during high traffic periods

---

### hasVision

> **hasVision**: `boolean`

Whether vision/image analysis is enabled

#### Description

Ability to analyze images and visual content

---

### hasFileAnalysis

> **hasFileAnalysis**: `boolean`

Whether file/document analysis is enabled

#### Description

Ability to process PDFs, documents, and other files

---

### hasCodeExecution

> **hasCodeExecution**: `boolean`

Whether code execution is enabled

#### Description

Access to code execution/analysis features

---

### hasMcpTools

> **hasMcpTools**: `boolean`

Whether MCP (Model Context Protocol) tools are enabled

#### Description

Access to external tool integrations via MCP

---

### hasComputerUse

> **hasComputerUse**: `boolean`

Whether computer use capability is enabled

#### Description

Access to computer use/automation features

---

### hasWebSearch

> **hasWebSearch**: `boolean`

Whether web search is enabled

#### Description

Access to web search capabilities

---

### maxContextWindow

> **maxContextWindow**: `number`

Maximum context window size in tokens

#### Description

Limit on context/conversation length

---

### maxOutputTokens

> **maxOutputTokens**: `number`

Maximum output tokens per request

#### Description

Limit on response length per request

---

### availableModels

> **availableModels**: `string`[]

List of accessible model identifiers

#### Description

Which Claude models are available for this tier

---

### dailyMessageLimit

> **dailyMessageLimit**: `number`

Daily message limit

#### Description

Maximum messages per day, -1 for unlimited

---

### monthlyTokenLimit

> **monthlyTokenLimit**: `number`

Monthly token limit

#### Description

Maximum tokens per month, -1 for unlimited

---

### hasUsageAnalytics

> **hasUsageAnalytics**: `boolean`

Whether usage analytics are available

#### Description

Access to detailed usage statistics and analytics

---

### hasTeamFeatures

> **hasTeamFeatures**: `boolean`

Whether team/organization features are enabled

#### Description

Access to team management and collaboration features

---

### customFeatures?

> `optional` **customFeatures?**: `Record`\<`string`, `boolean`\>

Custom feature flags for extensibility

#### Description

Additional feature flags for future capabilities
