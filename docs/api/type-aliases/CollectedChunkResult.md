[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CollectedChunkResult

# Type Alias: CollectedChunkResult

> **CollectedChunkResult** = `object`

Defined in: [types/providers.ts:2139](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2139)

## Properties

### rawResponseParts

> **rawResponseParts**: `unknown`[]

Defined in: [types/providers.ts:2140](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2140)

---

### stepFunctionCalls

> **stepFunctionCalls**: [`NativeFunctionCall`](NativeFunctionCall.md)[]

Defined in: [types/providers.ts:2141](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2141)

---

### finishReason?

> `optional` **finishReason?**: `string`

Defined in: [types/providers.ts:2143](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2143)

Raw `Candidate.finishReason` from the last chunk that carried one.

---

### inputTokens

> **inputTokens**: `number`

Defined in: [types/providers.ts:2144](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2144)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/providers.ts:2145](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2145)

---

### cacheReadTokens?

> `optional` **cacheReadTokens?**: `number`

Defined in: [types/providers.ts:2151](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2151)

Gemini cached-content tokens (overlapping: included in promptTokenCount).
Surfaced so the call site can subtract from input and bill at cacheRead
rate. Subtraction happens at the call site, not in the collector.

---

### cacheCreationTokens?

> `optional` **cacheCreationTokens?**: `number`

Defined in: [types/providers.ts:2153](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2153)

Cache creation tokens (symmetry; Gemini does not emit this).

---

### reasoningTokens?

> `optional` **reasoningTokens?**: `number`

Defined in: [types/providers.ts:2159](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2159)

Gemini thinking tokens (usageMetadata.thoughtsTokenCount). Billed at the
output rate but NOT included in candidatesTokenCount — Gemini reports
totalTokenCount = prompt + candidates + thoughts.
