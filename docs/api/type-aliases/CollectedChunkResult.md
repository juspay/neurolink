[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CollectedChunkResult

# Type Alias: CollectedChunkResult

> **CollectedChunkResult** = `object`

Defined in: [types/providers.ts:2056](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2056)

## Properties

### rawResponseParts

> **rawResponseParts**: `unknown`[]

Defined in: [types/providers.ts:2057](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2057)

---

### stepFunctionCalls

> **stepFunctionCalls**: [`NativeFunctionCall`](NativeFunctionCall.md)[]

Defined in: [types/providers.ts:2058](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2058)

---

### finishReason?

> `optional` **finishReason?**: `string`

Defined in: [types/providers.ts:2060](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2060)

Raw `Candidate.finishReason` from the last chunk that carried one.

---

### inputTokens

> **inputTokens**: `number`

Defined in: [types/providers.ts:2061](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2061)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/providers.ts:2062](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2062)

---

### cacheReadTokens?

> `optional` **cacheReadTokens?**: `number`

Defined in: [types/providers.ts:2068](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2068)

Gemini cached-content tokens (overlapping: included in promptTokenCount).
Surfaced so the call site can subtract from input and bill at cacheRead
rate. Subtraction happens at the call site, not in the collector.

---

### cacheCreationTokens?

> `optional` **cacheCreationTokens?**: `number`

Defined in: [types/providers.ts:2070](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2070)

Cache creation tokens (symmetry; Gemini does not emit this).

---

### reasoningTokens?

> `optional` **reasoningTokens?**: `number`

Defined in: [types/providers.ts:2076](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2076)

Gemini thinking tokens (usageMetadata.thoughtsTokenCount). Billed at the
output rate but NOT included in candidatesTokenCount — Gemini reports
totalTokenCount = prompt + candidates + thoughts.
