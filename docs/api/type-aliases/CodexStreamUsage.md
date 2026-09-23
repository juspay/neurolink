[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexStreamUsage

# Type Alias: CodexStreamUsage

> **CodexStreamUsage** = `object`

Defined in: [types/proxy.ts:2633](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2633)

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

Defined in: [types/proxy.ts:2635](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2635)

Distinguish missing provider usage from a reported zero.

---

### outputTokensObserved?

> `optional` **outputTokensObserved?**: `boolean`

Defined in: [types/proxy.ts:2636](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2636)

---

### inputTokens

> **inputTokens**: `number`

Defined in: [types/proxy.ts:2637](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2637)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/proxy.ts:2638](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2638)

---

### cacheReadTokens

> **cacheReadTokens**: `number`

Defined in: [types/proxy.ts:2639](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2639)

---

### cacheCreationTokens

> **cacheCreationTokens**: `number`

Defined in: [types/proxy.ts:2641](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2641)

Cache writes, which bill at a premium over both reads and plain input.

---

### reasoningTokens

> **reasoningTokens**: `number`

Defined in: [types/proxy.ts:2642](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2642)

---

### reasoningTokensObserved?

> `optional` **reasoningTokensObserved?**: `boolean`

Defined in: [types/proxy.ts:2644](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2644)

Whether the provider supplied a valid reasoning breakdown.
