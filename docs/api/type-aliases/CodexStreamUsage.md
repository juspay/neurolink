[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexStreamUsage

# Type Alias: CodexStreamUsage

> **CodexStreamUsage** = `object`

Defined in: [types/proxy.ts:2178](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2178)

Token usage scraped from a Codex (OpenAI Responses) SSE stream.

Verified against real traffic: captured from a live `codex exec` run through
the proxy on 2026-08-21 (`test/fixtures/codex-response-usage.sse`). The
shape is `response.completed` → `response.usage`, carrying `input_tokens`,
`output_tokens`, and an `input_tokens_details` object with `cached_tokens`
and `cache_write_tokens`. The parser also accepts the common variants. Treat
a null result as "not observed", never as "zero tokens".

## Properties

### inputTokens

> **inputTokens**: `number`

Defined in: [types/proxy.ts:2179](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2179)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/proxy.ts:2180](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2180)

---

### cacheReadTokens

> **cacheReadTokens**: `number`

Defined in: [types/proxy.ts:2181](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2181)

---

### cacheCreationTokens

> **cacheCreationTokens**: `number`

Defined in: [types/proxy.ts:2183](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2183)

Cache writes, which bill at a premium over both reads and plain input.

---

### reasoningTokens

> **reasoningTokens**: `number`

Defined in: [types/proxy.ts:2184](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2184)
