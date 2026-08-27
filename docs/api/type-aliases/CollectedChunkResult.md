[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CollectedChunkResult

# Type Alias: CollectedChunkResult

> **CollectedChunkResult** = `object`

Defined in: [types/providers.ts:2058](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2058)

## Properties

### rawResponseParts

> **rawResponseParts**: `unknown`[]

Defined in: [types/providers.ts:2059](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2059)

---

### stepFunctionCalls

> **stepFunctionCalls**: [`NativeFunctionCall`](NativeFunctionCall.md)[]

Defined in: [types/providers.ts:2060](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2060)

---

### finishReason?

> `optional` **finishReason?**: `string`

Defined in: [types/providers.ts:2062](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2062)

Raw `Candidate.finishReason` from the last chunk that carried one.

---

### inputTokens

> **inputTokens**: `number`

Defined in: [types/providers.ts:2063](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2063)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/providers.ts:2064](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2064)

---

### cacheReadTokens?

> `optional` **cacheReadTokens?**: `number`

Defined in: [types/providers.ts:2070](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2070)

Gemini cached-content tokens (overlapping: included in promptTokenCount).
Surfaced so the call site can subtract from input and bill at cacheRead
rate. Subtraction happens at the call site, not in the collector.

---

### cacheCreationTokens?

> `optional` **cacheCreationTokens?**: `number`

Defined in: [types/providers.ts:2072](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2072)

Cache creation tokens (symmetry; Gemini does not emit this).

---

### reasoningTokens?

> `optional` **reasoningTokens?**: `number`

Defined in: [types/providers.ts:2078](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2078)

Gemini thinking tokens (usageMetadata.thoughtsTokenCount). Billed at the
output rate but NOT included in candidatesTokenCount — Gemini reports
totalTokenCount = prompt + candidates + thoughts.
