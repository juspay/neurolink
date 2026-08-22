[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LocalUsageClaudeRawUsage

# Type Alias: LocalUsageClaudeRawUsage

> **LocalUsageClaudeRawUsage** = `object`

Defined in: [types/localUsage.ts:164](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L164)

The `message.usage` object exactly as Claude Code writes it into a
transcript line — snake_case, and every field optional because older
transcripts predate some of them.

## Properties

### input_tokens?

> `optional` **input_tokens?**: `number`

Defined in: [types/localUsage.ts:165](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L165)

---

### output_tokens?

> `optional` **output_tokens?**: `number`

Defined in: [types/localUsage.ts:166](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L166)

---

### cache_read_input_tokens?

> `optional` **cache_read_input_tokens?**: `number`

Defined in: [types/localUsage.ts:167](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L167)

---

### cache_creation_input_tokens?

> `optional` **cache_creation_input_tokens?**: `number`

Defined in: [types/localUsage.ts:168](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L168)
