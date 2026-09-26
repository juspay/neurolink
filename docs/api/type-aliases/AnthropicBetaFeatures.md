[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicBetaFeatures

# Type Alias: AnthropicBetaFeatures

> **AnthropicBetaFeatures** = `object`

Anthropic beta feature flags for beta header configuration

## Description

Defines available beta features that can be enabled via
the anthropic-beta header. Each feature enables specific beta functionality.

## See

https://docs.anthropic.com/en/api/versioning#beta-headers

## Properties

### computerUse?

> `optional` **computerUse?**: `boolean`

Enable computer use capability

#### Description

Allows Claude to interact with computer interfaces
Header value: "computer-use-2024-10-22"

---

### extendedThinking?

> `optional` **extendedThinking?**: `boolean`

Enable extended thinking/reasoning

#### Description

Allows extended thinking for complex reasoning tasks
Header value: "extended-thinking-2025-01-24"

---

### promptCaching?

> `optional` **promptCaching?**: `boolean`

Enable prompt caching

#### Description

Allows caching of prompts for reduced latency
Header value: "prompt-caching-2024-07-31"

---

### tokenCounting?

> `optional` **tokenCounting?**: `boolean`

Enable token counting

#### Description

Allows pre-counting tokens before generation
Header value: "token-counting-2024-11-01"

---

### messageBatches?

> `optional` **messageBatches?**: `boolean`

Enable message batches

#### Description

Allows batch processing of multiple messages
Header value: "message-batches-2024-09-24"

---

### pdfs?

> `optional` **pdfs?**: `boolean`

Enable PDF support

#### Description

Allows processing PDF documents
Header value: "pdfs-2024-09-25"

---

### maxTokensOverride?

> `optional` **maxTokensOverride?**: `boolean`

Enable max tokens override (for higher output limits)

#### Description

Allows requesting more output tokens than default
Header value: "max-tokens-3-5-sonnet-2024-07-15"

---

### interleavedThinking?

> `optional` **interleavedThinking?**: `boolean`

Enable interleaved thinking (for multi-turn reasoning)

#### Description

Allows interleaved thinking in conversations
Header value: "interleaved-thinking-2025-01-24"

---

### filesApi?

> `optional` **filesApi?**: `boolean`

Enable files API

#### Description

Allows using the Files API for document processing
Header value: "files-api-2025-01-15"

---

### mcpConnectors?

> `optional` **mcpConnectors?**: `boolean`

Enable MCP connectors

#### Description

Allows using MCP connectors for tool integrations
Header value: "mcp-connectors-2025-01-01"

---

### codeExecution?

> `optional` **codeExecution?**: `boolean`

Enable code execution

#### Description

Allows Claude to execute code
Header value: "code-execution-2025-01-24"

---

### custom?

> `optional` **custom?**: `string`[]

Custom beta features as raw strings

#### Description

For beta features not yet added to this type
