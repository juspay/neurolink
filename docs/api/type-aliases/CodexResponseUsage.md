[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexResponseUsage

# Type Alias: CodexResponseUsage

> **CodexResponseUsage** = `object`

Wire usage block inside a synthesized response.completed / non-stream response.

## Properties

### input_tokens

> **input_tokens**: `number`

---

### output_tokens

> **output_tokens**: `number`

---

### total_tokens

> **total_tokens**: `number`

---

### input_tokens_details?

> `optional` **input_tokens_details?**: `object`

Omitted entirely when neither cache field was observed on the Anthropic side.

#### cached_tokens?

> `optional` **cached_tokens?**: `number`

#### cache_write_tokens?

> `optional` **cache_write_tokens?**: `number`

---

### output_tokens_details?

> `optional` **output_tokens_details?**: `object`

Always omitted — ClaudeUsage carries no reasoning-token count to source it from.

#### reasoning_tokens?

> `optional` **reasoning_tokens?**: `number`
