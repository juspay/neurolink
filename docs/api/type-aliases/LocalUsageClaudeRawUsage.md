[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LocalUsageClaudeRawUsage

# Type Alias: LocalUsageClaudeRawUsage

> **LocalUsageClaudeRawUsage** = `object`

The `message.usage` object exactly as Claude Code writes it into a
transcript line — snake_case, and every field optional because older
transcripts predate some of them.

## Properties

### input_tokens?

> `optional` **input_tokens?**: `number`

---

### output_tokens?

> `optional` **output_tokens?**: `number`

---

### cache_read_input_tokens?

> `optional` **cache_read_input_tokens?**: `number`

---

### cache_creation_input_tokens?

> `optional` **cache_creation_input_tokens?**: `number`
