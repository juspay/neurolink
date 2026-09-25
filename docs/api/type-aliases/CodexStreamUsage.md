[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexStreamUsage

# Type Alias: CodexStreamUsage

> **CodexStreamUsage** = `object`

Defined in: [types/proxy.ts:2721](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2721)

Token usage scraped from a Codex (OpenAI Responses) SSE stream.

Verified against real traffic: captured from a live `codex exec` run through
the proxy on 2026-08-21 (`test/fixtures/codex-response-usage.sse`). The
shape is `response.completed` → `response.usage`, carrying `input_tokens`,
`output_tokens`, and an `input_tokens_details` object with `cached_tokens`
and `cache_write_tokens`. The parser also accepts the common variants. Treat
a null result as "not observed", never as "zero tokens".

## Properties

### inputTokensObserved?

> `optional` **inputTokensObserved?**: `boolean`

Defined in: [types/proxy.ts:2723](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2723)

Distinguish missing provider usage from a reported zero.

---

### outputTokensObserved?

> `optional` **outputTokensObserved?**: `boolean`

Defined in: [types/proxy.ts:2724](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2724)

---

### inputTokens

> **inputTokens**: `number`

Defined in: [types/proxy.ts:2725](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2725)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/proxy.ts:2726](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2726)

---

### cacheReadTokens

> **cacheReadTokens**: `number`

Defined in: [types/proxy.ts:2727](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2727)

---

### cacheCreationTokens

> **cacheCreationTokens**: `number`

Defined in: [types/proxy.ts:2729](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2729)

Cache writes, which bill at a premium over both reads and plain input.

---

### reasoningTokens

> **reasoningTokens**: `number`

Defined in: [types/proxy.ts:2730](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2730)

---

### reasoningTokensObserved?

> `optional` **reasoningTokensObserved?**: `boolean`

Defined in: [types/proxy.ts:2732](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2732)

Whether the provider supplied a valid reasoning breakdown.
