[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicBetaFeatures

# Type Alias: AnthropicBetaFeatures

> **AnthropicBetaFeatures** = `object`

Defined in: [types/subscription.ts:729](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L729)

Anthropic beta feature flags for beta header configuration

## Description

Defines available beta features that can be enabled via
the anthropic-beta header. Each feature enables specific beta functionality.

## See

https://docs.anthropic.com/en/api/versioning#beta-headers

## Properties

### computerUse?

> `optional` **computerUse?**: `boolean`

Defined in: [types/subscription.ts:735](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L735)

Enable computer use capability

#### Description

Allows Claude to interact with computer interfaces
Header value: "computer-use-2024-10-22"

---

### extendedThinking?

> `optional` **extendedThinking?**: `boolean`

Defined in: [types/subscription.ts:742](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L742)

Enable extended thinking/reasoning

#### Description

Allows extended thinking for complex reasoning tasks
Header value: "extended-thinking-2025-01-24"

---

### promptCaching?

> `optional` **promptCaching?**: `boolean`

Defined in: [types/subscription.ts:749](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L749)

Enable prompt caching

#### Description

Allows caching of prompts for reduced latency
Header value: "prompt-caching-2024-07-31"

---

### tokenCounting?

> `optional` **tokenCounting?**: `boolean`

Defined in: [types/subscription.ts:756](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L756)

Enable token counting

#### Description

Allows pre-counting tokens before generation
Header value: "token-counting-2024-11-01"

---

### messageBatches?

> `optional` **messageBatches?**: `boolean`

Defined in: [types/subscription.ts:763](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L763)

Enable message batches

#### Description

Allows batch processing of multiple messages
Header value: "message-batches-2024-09-24"

---

### pdfs?

> `optional` **pdfs?**: `boolean`

Defined in: [types/subscription.ts:770](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L770)

Enable PDF support

#### Description

Allows processing PDF documents
Header value: "pdfs-2024-09-25"

---

### maxTokensOverride?

> `optional` **maxTokensOverride?**: `boolean`

Defined in: [types/subscription.ts:777](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L777)

Enable max tokens override (for higher output limits)

#### Description

Allows requesting more output tokens than default
Header value: "max-tokens-3-5-sonnet-2024-07-15"

---

### interleavedThinking?

> `optional` **interleavedThinking?**: `boolean`

Defined in: [types/subscription.ts:784](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L784)

Enable interleaved thinking (for multi-turn reasoning)

#### Description

Allows interleaved thinking in conversations
Header value: "interleaved-thinking-2025-01-24"

---

### filesApi?

> `optional` **filesApi?**: `boolean`

Defined in: [types/subscription.ts:791](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L791)

Enable files API

#### Description

Allows using the Files API for document processing
Header value: "files-api-2025-01-15"

---

### mcpConnectors?

> `optional` **mcpConnectors?**: `boolean`

Defined in: [types/subscription.ts:798](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L798)

Enable MCP connectors

#### Description

Allows using MCP connectors for tool integrations
Header value: "mcp-connectors-2025-01-01"

---

### codeExecution?

> `optional` **codeExecution?**: `boolean`

Defined in: [types/subscription.ts:805](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L805)

Enable code execution

#### Description

Allows Claude to execute code
Header value: "code-execution-2025-01-24"

---

### custom?

> `optional` **custom?**: `string`[]

Defined in: [types/subscription.ts:811](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L811)

Custom beta features as raw strings

#### Description

For beta features not yet added to this type
