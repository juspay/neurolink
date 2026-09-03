[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CollectedChunkResult

# Type Alias: CollectedChunkResult

> **CollectedChunkResult** = `object`

Defined in: [types/providers.ts:2088](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2088)

## Properties

### rawResponseParts

> **rawResponseParts**: `unknown`[]

Defined in: [types/providers.ts:2089](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2089)

---

### stepFunctionCalls

> **stepFunctionCalls**: [`NativeFunctionCall`](NativeFunctionCall.md)[]

Defined in: [types/providers.ts:2090](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2090)

---

### finishReason?

> `optional` **finishReason?**: `string`

Defined in: [types/providers.ts:2092](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2092)

Raw `Candidate.finishReason` from the last chunk that carried one.

---

### inputTokens

> **inputTokens**: `number`

Defined in: [types/providers.ts:2093](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2093)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/providers.ts:2094](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2094)

---

### cacheReadTokens?

> `optional` **cacheReadTokens?**: `number`

Defined in: [types/providers.ts:2100](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2100)

Gemini cached-content tokens (overlapping: included in promptTokenCount).
Surfaced so the call site can subtract from input and bill at cacheRead
rate. Subtraction happens at the call site, not in the collector.

---

### cacheCreationTokens?

> `optional` **cacheCreationTokens?**: `number`

Defined in: [types/providers.ts:2102](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2102)

Cache creation tokens (symmetry; Gemini does not emit this).

---

### reasoningTokens?

> `optional` **reasoningTokens?**: `number`

Defined in: [types/providers.ts:2108](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2108)

Gemini thinking tokens (usageMetadata.thoughtsTokenCount). Billed at the
output rate but NOT included in candidatesTokenCount — Gemini reports
totalTokenCount = prompt + candidates + thoughts.
