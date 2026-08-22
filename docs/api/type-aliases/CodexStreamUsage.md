[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexStreamUsage

# Type Alias: CodexStreamUsage

> **CodexStreamUsage** = `object`

Defined in: [types/proxy.ts:2068](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2068)

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

Defined in: [types/proxy.ts:2069](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2069)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/proxy.ts:2070](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2070)

---

### cacheReadTokens

> **cacheReadTokens**: `number`

Defined in: [types/proxy.ts:2071](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2071)

---

### cacheCreationTokens

> **cacheCreationTokens**: `number`

Defined in: [types/proxy.ts:2073](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2073)

Cache writes, which bill at a premium over both reads and plain input.

---

### reasoningTokens

> **reasoningTokens**: `number`

Defined in: [types/proxy.ts:2074](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2074)
