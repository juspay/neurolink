[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CollectedChunkResult

# Type Alias: CollectedChunkResult

> **CollectedChunkResult** = `object`

Defined in: [types/providers.ts:2095](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2095)

## Properties

### rawResponseParts

> **rawResponseParts**: `unknown`[]

Defined in: [types/providers.ts:2096](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2096)

---

### stepFunctionCalls

> **stepFunctionCalls**: [`NativeFunctionCall`](NativeFunctionCall.md)[]

Defined in: [types/providers.ts:2097](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2097)

---

### finishReason?

> `optional` **finishReason?**: `string`

Defined in: [types/providers.ts:2099](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2099)

Raw `Candidate.finishReason` from the last chunk that carried one.

---

### inputTokens

> **inputTokens**: `number`

Defined in: [types/providers.ts:2100](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2100)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/providers.ts:2101](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2101)

---

### cacheReadTokens?

> `optional` **cacheReadTokens?**: `number`

Defined in: [types/providers.ts:2107](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2107)

Gemini cached-content tokens (overlapping: included in promptTokenCount).
Surfaced so the call site can subtract from input and bill at cacheRead
rate. Subtraction happens at the call site, not in the collector.

---

### cacheCreationTokens?

> `optional` **cacheCreationTokens?**: `number`

Defined in: [types/providers.ts:2109](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2109)

Cache creation tokens (symmetry; Gemini does not emit this).

---

### reasoningTokens?

> `optional` **reasoningTokens?**: `number`

Defined in: [types/providers.ts:2115](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2115)

Gemini thinking tokens (usageMetadata.thoughtsTokenCount). Billed at the
output rate but NOT included in candidatesTokenCount — Gemini reports
totalTokenCount = prompt + candidates + thoughts.
