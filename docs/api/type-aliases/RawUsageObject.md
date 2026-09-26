[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RawUsageObject

# Type Alias: RawUsageObject

> **RawUsageObject** = `object`

Raw usage object that may come from various AI providers.
Supports multiple naming conventions and nested structures.

## Properties

### input?

> `optional` **input?**: `number`

---

### output?

> `optional` **output?**: `number`

---

### total?

> `optional` **total?**: `number`

---

### inputTokens?

> `optional` **inputTokens?**: `number`

---

### outputTokens?

> `optional` **outputTokens?**: `number`

---

### totalTokens?

> `optional` **totalTokens?**: `number`

---

### promptTokens?

> `optional` **promptTokens?**: `number`

---

### completionTokens?

> `optional` **completionTokens?**: `number`

---

### cacheCreationInputTokens?

> `optional` **cacheCreationInputTokens?**: `number`

---

### cacheReadInputTokens?

> `optional` **cacheReadInputTokens?**: `number`

---

### cacheCreationTokens?

> `optional` **cacheCreationTokens?**: `number`

---

### cacheReadTokens?

> `optional` **cacheReadTokens?**: `number`

---

### cachedInputTokens?

> `optional` **cachedInputTokens?**: `number`

---

### inputTokenDetails?

> `optional` **inputTokenDetails?**: `object`

#### noCacheTokens?

> `optional` **noCacheTokens?**: `number`

#### cacheReadTokens?

> `optional` **cacheReadTokens?**: `number`

#### cacheWriteTokens?

> `optional` **cacheWriteTokens?**: `number`

---

### prompt_tokens_details?

> `optional` **prompt_tokens_details?**: `object`

#### cached_tokens?

> `optional` **cached_tokens?**: `number`

---

### reasoningTokens?

> `optional` **reasoningTokens?**: `number`

---

### reasoning?

> `optional` **reasoning?**: `number`

---

### reasoning_tokens?

> `optional` **reasoning_tokens?**: `number`

---

### thinkingTokens?

> `optional` **thinkingTokens?**: `number`

---

### usage?

> `optional` **usage?**: `RawUsageObject`
