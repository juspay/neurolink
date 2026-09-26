[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CollectedChunkResult

# Type Alias: CollectedChunkResult

> **CollectedChunkResult** = `object`

Defined in: [types/providers.ts:2158](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2158)

## Properties

### rawResponseParts

> **rawResponseParts**: `unknown`[]

Defined in: [types/providers.ts:2159](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2159)

---

### stepFunctionCalls

> **stepFunctionCalls**: [`NativeFunctionCall`](NativeFunctionCall.md)[]

Defined in: [types/providers.ts:2160](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2160)

---

### finishReason?

> `optional` **finishReason?**: `string`

Defined in: [types/providers.ts:2162](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2162)

Raw `Candidate.finishReason` from the last chunk that carried one.

---

### inputTokens

> **inputTokens**: `number`

Defined in: [types/providers.ts:2163](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2163)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/providers.ts:2164](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2164)

---

### cacheReadTokens?

> `optional` **cacheReadTokens?**: `number`

Defined in: [types/providers.ts:2170](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2170)

Gemini cached-content tokens (overlapping: included in promptTokenCount).
Surfaced so the call site can subtract from input and bill at cacheRead
rate. Subtraction happens at the call site, not in the collector.

---

### cacheCreationTokens?

> `optional` **cacheCreationTokens?**: `number`

Defined in: [types/providers.ts:2172](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2172)

Cache creation tokens (symmetry; Gemini does not emit this).

---

### reasoningTokens?

> `optional` **reasoningTokens?**: `number`

Defined in: [types/providers.ts:2178](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2178)

Gemini thinking tokens (usageMetadata.thoughtsTokenCount). Billed at the
output rate but NOT included in candidatesTokenCount — Gemini reports
totalTokenCount = prompt + candidates + thoughts.
