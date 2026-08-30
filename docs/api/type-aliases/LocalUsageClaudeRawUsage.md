[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LocalUsageClaudeRawUsage

# Type Alias: LocalUsageClaudeRawUsage

> **LocalUsageClaudeRawUsage** = `object`

Defined in: [types/localUsage.ts:253](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L253)

The `message.usage` object exactly as Claude Code writes it into a
transcript line — snake_case, and every field optional because older
transcripts predate some of them.

## Properties

### input_tokens?

> `optional` **input_tokens?**: `number`

Defined in: [types/localUsage.ts:254](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L254)

---

### output_tokens?

> `optional` **output_tokens?**: `number`

Defined in: [types/localUsage.ts:255](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L255)

---

### cache_read_input_tokens?

> `optional` **cache_read_input_tokens?**: `number`

Defined in: [types/localUsage.ts:256](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L256)

---

### cache_creation_input_tokens?

> `optional` **cache_creation_input_tokens?**: `number`

Defined in: [types/localUsage.ts:257](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L257)
