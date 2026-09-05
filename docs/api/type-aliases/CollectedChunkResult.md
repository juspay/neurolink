[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CollectedChunkResult

# Type Alias: CollectedChunkResult

> **CollectedChunkResult** = `object`

Defined in: [types/providers.ts:2099](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2099)

## Properties

### rawResponseParts

> **rawResponseParts**: `unknown`[]

Defined in: [types/providers.ts:2100](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2100)

---

### stepFunctionCalls

> **stepFunctionCalls**: [`NativeFunctionCall`](NativeFunctionCall.md)[]

Defined in: [types/providers.ts:2101](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2101)

---

### finishReason?

> `optional` **finishReason?**: `string`

Defined in: [types/providers.ts:2103](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2103)

Raw `Candidate.finishReason` from the last chunk that carried one.

---

### inputTokens

> **inputTokens**: `number`

Defined in: [types/providers.ts:2104](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2104)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/providers.ts:2105](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2105)

---

### cacheReadTokens?

> `optional` **cacheReadTokens?**: `number`

Defined in: [types/providers.ts:2111](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2111)

Gemini cached-content tokens (overlapping: included in promptTokenCount).
Surfaced so the call site can subtract from input and bill at cacheRead
rate. Subtraction happens at the call site, not in the collector.

---

### cacheCreationTokens?

> `optional` **cacheCreationTokens?**: `number`

Defined in: [types/providers.ts:2113](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2113)

Cache creation tokens (symmetry; Gemini does not emit this).

---

### reasoningTokens?

> `optional` **reasoningTokens?**: `number`

Defined in: [types/providers.ts:2119](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2119)

Gemini thinking tokens (usageMetadata.thoughtsTokenCount). Billed at the
output rate but NOT included in candidatesTokenCount — Gemini reports
totalTokenCount = prompt + candidates + thoughts.
