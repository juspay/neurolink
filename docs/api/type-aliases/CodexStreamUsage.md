[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexStreamUsage

# Type Alias: CodexStreamUsage

> **CodexStreamUsage** = `object`

Defined in: [types/proxy.ts:2767](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2767)

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

Defined in: [types/proxy.ts:2769](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2769)

Distinguish missing provider usage from a reported zero.

---

### outputTokensObserved?

> `optional` **outputTokensObserved?**: `boolean`

Defined in: [types/proxy.ts:2770](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2770)

---

### inputTokens

> **inputTokens**: `number`

Defined in: [types/proxy.ts:2771](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2771)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/proxy.ts:2772](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2772)

---

### cacheReadTokens

> **cacheReadTokens**: `number`

Defined in: [types/proxy.ts:2773](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2773)

---

### cacheCreationTokens

> **cacheCreationTokens**: `number`

Defined in: [types/proxy.ts:2775](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2775)

Cache writes, which bill at a premium over both reads and plain input.

---

### cacheReadTokensObserved?

> `optional` **cacheReadTokensObserved?**: `boolean`

Defined in: [types/proxy.ts:2790](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2790)

Whether the provider supplied each cache count, tracked per field.

Without this a reply that omits `input_tokens_details` is recorded as a
total cache miss rather than as unknown, which biases every measured cache
rate downward. Input, output and reasoning already carry this distinction.

The two fields are tracked separately because a reply can carry one and
not the other: a single flag covering both would let a missing
`cache_write_tokens` ride in on an observed `cached_tokens` and be
recorded as a real zero. A count that is present but not a finite,
non-negative number is not observed either — `nonNegativeInt` floors it to
zero, which is indistinguishable from a genuine zero once recorded.

---

### cacheCreationTokensObserved?

> `optional` **cacheCreationTokensObserved?**: `boolean`

Defined in: [types/proxy.ts:2791](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2791)

---

### reasoningTokens

> **reasoningTokens**: `number`

Defined in: [types/proxy.ts:2792](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2792)

---

### reasoningTokensObserved?

> `optional` **reasoningTokensObserved?**: `boolean`

Defined in: [types/proxy.ts:2794](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2794)

Whether the provider supplied a valid reasoning breakdown.
