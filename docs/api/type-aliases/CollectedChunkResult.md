[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CollectedChunkResult

# Type Alias: CollectedChunkResult

> **CollectedChunkResult** = `object`

Defined in: [types/providers.ts:2057](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2057)

## Properties

### rawResponseParts

> **rawResponseParts**: `unknown`[]

Defined in: [types/providers.ts:2058](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2058)

---

### stepFunctionCalls

> **stepFunctionCalls**: [`NativeFunctionCall`](NativeFunctionCall.md)[]

Defined in: [types/providers.ts:2059](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2059)

---

### finishReason?

> `optional` **finishReason?**: `string`

Defined in: [types/providers.ts:2061](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2061)

Raw `Candidate.finishReason` from the last chunk that carried one.

---

### inputTokens

> **inputTokens**: `number`

Defined in: [types/providers.ts:2062](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2062)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/providers.ts:2063](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2063)

---

### cacheReadTokens?

> `optional` **cacheReadTokens?**: `number`

Defined in: [types/providers.ts:2069](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2069)

Gemini cached-content tokens (overlapping: included in promptTokenCount).
Surfaced so the call site can subtract from input and bill at cacheRead
rate. Subtraction happens at the call site, not in the collector.

---

### cacheCreationTokens?

> `optional` **cacheCreationTokens?**: `number`

Defined in: [types/providers.ts:2071](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2071)

Cache creation tokens (symmetry; Gemini does not emit this).

---

### reasoningTokens?

> `optional` **reasoningTokens?**: `number`

Defined in: [types/providers.ts:2077](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2077)

Gemini thinking tokens (usageMetadata.thoughtsTokenCount). Billed at the
output rate but NOT included in candidatesTokenCount — Gemini reports
totalTokenCount = prompt + candidates + thoughts.
