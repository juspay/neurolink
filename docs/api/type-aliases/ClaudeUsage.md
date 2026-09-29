[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClaudeUsage

# Type Alias: ClaudeUsage

> **ClaudeUsage** = `object`

Usage counters returned in a Claude response.

## Properties

### input_tokens

> **input_tokens**: `number`

---

### output_tokens

> **output_tokens**: `number`

---

### cache_creation_input_tokens?

> `optional` **cache_creation_input_tokens?**: `number`

---

### cache_read_input_tokens?

> `optional` **cache_read_input_tokens?**: `number`

---

### cacheCreation1hTokens?

> `optional` **cacheCreation1hTokens?**: `number`

The 1-hour-TTL share of `cache_creation_input_tokens` (a subset, not
additive), read from Anthropic's `usage.cache_creation.ephemeral_1h_input_tokens`.
Omitted means "none known to be 1h", matching `UsageContext.cacheCreation1hTokens`'s
own contract — every path that does not observe the breakdown prices exactly
as before.
