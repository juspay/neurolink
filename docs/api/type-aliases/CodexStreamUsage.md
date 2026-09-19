[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexStreamUsage

# Type Alias: CodexStreamUsage

> **CodexStreamUsage** = `object`

Defined in: [types/proxy.ts:2582](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2582)

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

Defined in: [types/proxy.ts:2584](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2584)

Distinguish missing provider usage from a reported zero.

---

### outputTokensObserved?

> `optional` **outputTokensObserved?**: `boolean`

Defined in: [types/proxy.ts:2585](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2585)

---

### inputTokens

> **inputTokens**: `number`

Defined in: [types/proxy.ts:2586](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2586)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/proxy.ts:2587](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2587)

---

### cacheReadTokens

> **cacheReadTokens**: `number`

Defined in: [types/proxy.ts:2588](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2588)

---

### cacheCreationTokens

> **cacheCreationTokens**: `number`

Defined in: [types/proxy.ts:2590](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2590)

Cache writes, which bill at a premium over both reads and plain input.

---

### reasoningTokens

> **reasoningTokens**: `number`

Defined in: [types/proxy.ts:2591](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2591)

---

### reasoningTokensObserved?

> `optional` **reasoningTokensObserved?**: `boolean`

Defined in: [types/proxy.ts:2593](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2593)

Whether the provider supplied a valid reasoning breakdown.
