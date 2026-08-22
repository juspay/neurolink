[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicBetaFeatures

# Type Alias: AnthropicBetaFeatures

> **AnthropicBetaFeatures** = `object`

Defined in: [types/subscription.ts:811](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/subscription.ts#L811)

Anthropic beta feature flags for beta header configuration

## Description

Defines available beta features that can be enabled via
the anthropic-beta header. Each feature enables specific beta functionality.

## See

https://docs.anthropic.com/en/api/versioning#beta-headers

## Properties

### computerUse?

> `optional` **computerUse?**: `boolean`

Defined in: [types/subscription.ts:817](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/subscription.ts#L817)

Enable computer use capability

#### Description

Allows Claude to interact with computer interfaces
Header value: "computer-use-2024-10-22"

---

### extendedThinking?

> `optional` **extendedThinking?**: `boolean`

Defined in: [types/subscription.ts:824](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/subscription.ts#L824)

Enable extended thinking/reasoning

#### Description

Allows extended thinking for complex reasoning tasks
Header value: "extended-thinking-2025-01-24"

---

### promptCaching?

> `optional` **promptCaching?**: `boolean`

Defined in: [types/subscription.ts:831](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/subscription.ts#L831)

Enable prompt caching

#### Description

Allows caching of prompts for reduced latency
Header value: "prompt-caching-2024-07-31"

---

### tokenCounting?

> `optional` **tokenCounting?**: `boolean`

Defined in: [types/subscription.ts:838](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/subscription.ts#L838)

Enable token counting

#### Description

Allows pre-counting tokens before generation
Header value: "token-counting-2024-11-01"

---

### messageBatches?

> `optional` **messageBatches?**: `boolean`

Defined in: [types/subscription.ts:845](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/subscription.ts#L845)

Enable message batches

#### Description

Allows batch processing of multiple messages
Header value: "message-batches-2024-09-24"

---

### pdfs?

> `optional` **pdfs?**: `boolean`

Defined in: [types/subscription.ts:852](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/subscription.ts#L852)

Enable PDF support

#### Description

Allows processing PDF documents
Header value: "pdfs-2024-09-25"

---

### maxTokensOverride?

> `optional` **maxTokensOverride?**: `boolean`

Defined in: [types/subscription.ts:859](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/subscription.ts#L859)

Enable max tokens override (for higher output limits)

#### Description

Allows requesting more output tokens than default
Header value: "max-tokens-3-5-sonnet-2024-07-15"

---

### interleavedThinking?

> `optional` **interleavedThinking?**: `boolean`

Defined in: [types/subscription.ts:866](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/subscription.ts#L866)

Enable interleaved thinking (for multi-turn reasoning)

#### Description

Allows interleaved thinking in conversations
Header value: "interleaved-thinking-2025-01-24"

---

### filesApi?

> `optional` **filesApi?**: `boolean`

Defined in: [types/subscription.ts:873](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/subscription.ts#L873)

Enable files API

#### Description

Allows using the Files API for document processing
Header value: "files-api-2025-01-15"

---

### mcpConnectors?

> `optional` **mcpConnectors?**: `boolean`

Defined in: [types/subscription.ts:880](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/subscription.ts#L880)

Enable MCP connectors

#### Description

Allows using MCP connectors for tool integrations
Header value: "mcp-connectors-2025-01-01"

---

### codeExecution?

> `optional` **codeExecution?**: `boolean`

Defined in: [types/subscription.ts:887](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/subscription.ts#L887)

Enable code execution

#### Description

Allows Claude to execute code
Header value: "code-execution-2025-01-24"

---

### custom?

> `optional` **custom?**: `string`[]

Defined in: [types/subscription.ts:893](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/subscription.ts#L893)

Custom beta features as raw strings

#### Description

For beta features not yet added to this type
