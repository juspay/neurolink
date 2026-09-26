[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexStreamUsage

# Type Alias: CodexStreamUsage

> **CodexStreamUsage** = `object`

Defined in: [types/proxy.ts:2723](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2723)

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

Defined in: [types/proxy.ts:2725](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2725)

Distinguish missing provider usage from a reported zero.

---

### outputTokensObserved?

> `optional` **outputTokensObserved?**: `boolean`

Defined in: [types/proxy.ts:2726](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2726)

---

### inputTokens

> **inputTokens**: `number`

Defined in: [types/proxy.ts:2727](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2727)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/proxy.ts:2728](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2728)

---

### cacheReadTokens

> **cacheReadTokens**: `number`

Defined in: [types/proxy.ts:2729](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2729)

---

### cacheCreationTokens

> **cacheCreationTokens**: `number`

Defined in: [types/proxy.ts:2731](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2731)

Cache writes, which bill at a premium over both reads and plain input.

---

### reasoningTokens

> **reasoningTokens**: `number`

Defined in: [types/proxy.ts:2732](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2732)

---

### reasoningTokensObserved?

> `optional` **reasoningTokensObserved?**: `boolean`

Defined in: [types/proxy.ts:2734](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2734)

Whether the provider supplied a valid reasoning breakdown.
