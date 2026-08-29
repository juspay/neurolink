[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LocalUsageClaudeRawUsage

# Type Alias: LocalUsageClaudeRawUsage

> **LocalUsageClaudeRawUsage** = `object`

Defined in: [types/localUsage.ts:184](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L184)

The `message.usage` object exactly as Claude Code writes it into a
transcript line — snake_case, and every field optional because older
transcripts predate some of them.

## Properties

### input_tokens?

> `optional` **input_tokens?**: `number`

Defined in: [types/localUsage.ts:185](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L185)

---

### output_tokens?

> `optional` **output_tokens?**: `number`

Defined in: [types/localUsage.ts:186](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L186)

---

### cache_read_input_tokens?

> `optional` **cache_read_input_tokens?**: `number`

Defined in: [types/localUsage.ts:187](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L187)

---

### cache_creation_input_tokens?

> `optional` **cache_creation_input_tokens?**: `number`

Defined in: [types/localUsage.ts:188](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L188)
