[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CollectedChunkResult

# Type Alias: CollectedChunkResult

> **CollectedChunkResult** = `object`

Defined in: [types/providers.ts:2136](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2136)

## Properties

### rawResponseParts

> **rawResponseParts**: `unknown`[]

Defined in: [types/providers.ts:2137](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2137)

---

### stepFunctionCalls

> **stepFunctionCalls**: [`NativeFunctionCall`](NativeFunctionCall.md)[]

Defined in: [types/providers.ts:2138](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2138)

---

### finishReason?

> `optional` **finishReason?**: `string`

Defined in: [types/providers.ts:2140](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2140)

Raw `Candidate.finishReason` from the last chunk that carried one.

---

### inputTokens

> **inputTokens**: `number`

Defined in: [types/providers.ts:2141](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2141)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/providers.ts:2142](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2142)

---

### cacheReadTokens?

> `optional` **cacheReadTokens?**: `number`

Defined in: [types/providers.ts:2148](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2148)

Gemini cached-content tokens (overlapping: included in promptTokenCount).
Surfaced so the call site can subtract from input and bill at cacheRead
rate. Subtraction happens at the call site, not in the collector.

---

### cacheCreationTokens?

> `optional` **cacheCreationTokens?**: `number`

Defined in: [types/providers.ts:2150](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2150)

Cache creation tokens (symmetry; Gemini does not emit this).

---

### reasoningTokens?

> `optional` **reasoningTokens?**: `number`

Defined in: [types/providers.ts:2156](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2156)

Gemini thinking tokens (usageMetadata.thoughtsTokenCount). Billed at the
output rate but NOT included in candidatesTokenCount — Gemini reports
totalTokenCount = prompt + candidates + thoughts.
