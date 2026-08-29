[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CollectedChunkResult

# Type Alias: CollectedChunkResult

> **CollectedChunkResult** = `object`

Defined in: [types/providers.ts:2070](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2070)

## Properties

### rawResponseParts

> **rawResponseParts**: `unknown`[]

Defined in: [types/providers.ts:2071](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2071)

---

### stepFunctionCalls

> **stepFunctionCalls**: [`NativeFunctionCall`](NativeFunctionCall.md)[]

Defined in: [types/providers.ts:2072](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2072)

---

### finishReason?

> `optional` **finishReason?**: `string`

Defined in: [types/providers.ts:2074](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2074)

Raw `Candidate.finishReason` from the last chunk that carried one.

---

### inputTokens

> **inputTokens**: `number`

Defined in: [types/providers.ts:2075](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2075)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/providers.ts:2076](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2076)

---

### cacheReadTokens?

> `optional` **cacheReadTokens?**: `number`

Defined in: [types/providers.ts:2082](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2082)

Gemini cached-content tokens (overlapping: included in promptTokenCount).
Surfaced so the call site can subtract from input and bill at cacheRead
rate. Subtraction happens at the call site, not in the collector.

---

### cacheCreationTokens?

> `optional` **cacheCreationTokens?**: `number`

Defined in: [types/providers.ts:2084](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2084)

Cache creation tokens (symmetry; Gemini does not emit this).

---

### reasoningTokens?

> `optional` **reasoningTokens?**: `number`

Defined in: [types/providers.ts:2090](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2090)

Gemini thinking tokens (usageMetadata.thoughtsTokenCount). Billed at the
output rate but NOT included in candidatesTokenCount — Gemini reports
totalTokenCount = prompt + candidates + thoughts.
