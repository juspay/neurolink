[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicBetaFeatures

# Type Alias: AnthropicBetaFeatures

> **AnthropicBetaFeatures** = `object`

Defined in: [types/subscription.ts:812](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L812)

Anthropic beta feature flags for beta header configuration

## Description

Defines available beta features that can be enabled via
the anthropic-beta header. Each feature enables specific beta functionality.

## See

https://docs.anthropic.com/en/api/versioning#beta-headers

## Properties

### computerUse?

> `optional` **computerUse?**: `boolean`

Defined in: [types/subscription.ts:818](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L818)

Enable computer use capability

#### Description

Allows Claude to interact with computer interfaces
Header value: "computer-use-2024-10-22"

---

### extendedThinking?

> `optional` **extendedThinking?**: `boolean`

Defined in: [types/subscription.ts:825](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L825)

Enable extended thinking/reasoning

#### Description

Allows extended thinking for complex reasoning tasks
Header value: "extended-thinking-2025-01-24"

---

### promptCaching?

> `optional` **promptCaching?**: `boolean`

Defined in: [types/subscription.ts:832](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L832)

Enable prompt caching

#### Description

Allows caching of prompts for reduced latency
Header value: "prompt-caching-2024-07-31"

---

### tokenCounting?

> `optional` **tokenCounting?**: `boolean`

Defined in: [types/subscription.ts:839](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L839)

Enable token counting

#### Description

Allows pre-counting tokens before generation
Header value: "token-counting-2024-11-01"

---

### messageBatches?

> `optional` **messageBatches?**: `boolean`

Defined in: [types/subscription.ts:846](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L846)

Enable message batches

#### Description

Allows batch processing of multiple messages
Header value: "message-batches-2024-09-24"

---

### pdfs?

> `optional` **pdfs?**: `boolean`

Defined in: [types/subscription.ts:853](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L853)

Enable PDF support

#### Description

Allows processing PDF documents
Header value: "pdfs-2024-09-25"

---

### maxTokensOverride?

> `optional` **maxTokensOverride?**: `boolean`

Defined in: [types/subscription.ts:860](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L860)

Enable max tokens override (for higher output limits)

#### Description

Allows requesting more output tokens than default
Header value: "max-tokens-3-5-sonnet-2024-07-15"

---

### interleavedThinking?

> `optional` **interleavedThinking?**: `boolean`

Defined in: [types/subscription.ts:867](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L867)

Enable interleaved thinking (for multi-turn reasoning)

#### Description

Allows interleaved thinking in conversations
Header value: "interleaved-thinking-2025-01-24"

---

### filesApi?

> `optional` **filesApi?**: `boolean`

Defined in: [types/subscription.ts:874](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L874)

Enable files API

#### Description

Allows using the Files API for document processing
Header value: "files-api-2025-01-15"

---

### mcpConnectors?

> `optional` **mcpConnectors?**: `boolean`

Defined in: [types/subscription.ts:881](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L881)

Enable MCP connectors

#### Description

Allows using MCP connectors for tool integrations
Header value: "mcp-connectors-2025-01-01"

---

### codeExecution?

> `optional` **codeExecution?**: `boolean`

Defined in: [types/subscription.ts:888](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L888)

Enable code execution

#### Description

Allows Claude to execute code
Header value: "code-execution-2025-01-24"

---

### custom?

> `optional` **custom?**: `string`[]

Defined in: [types/subscription.ts:894](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L894)

Custom beta features as raw strings

#### Description

For beta features not yet added to this type
