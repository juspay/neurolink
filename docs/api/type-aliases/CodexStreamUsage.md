[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexStreamUsage

# Type Alias: CodexStreamUsage

> **CodexStreamUsage** = `object`

Defined in: [types/proxy.ts:2653](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2653)

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

Defined in: [types/proxy.ts:2655](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2655)

Distinguish missing provider usage from a reported zero.

---

### outputTokensObserved?

> `optional` **outputTokensObserved?**: `boolean`

Defined in: [types/proxy.ts:2656](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2656)

---

### inputTokens

> **inputTokens**: `number`

Defined in: [types/proxy.ts:2657](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2657)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/proxy.ts:2658](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2658)

---

### cacheReadTokens

> **cacheReadTokens**: `number`

Defined in: [types/proxy.ts:2659](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2659)

---

### cacheCreationTokens

> **cacheCreationTokens**: `number`

Defined in: [types/proxy.ts:2661](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2661)

Cache writes, which bill at a premium over both reads and plain input.

---

### reasoningTokens

> **reasoningTokens**: `number`

Defined in: [types/proxy.ts:2662](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2662)

---

### reasoningTokensObserved?

> `optional` **reasoningTokensObserved?**: `boolean`

Defined in: [types/proxy.ts:2664](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2664)

Whether the provider supplied a valid reasoning breakdown.
