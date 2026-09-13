[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CollectedChunkResult

# Type Alias: CollectedChunkResult

> **CollectedChunkResult** = `object`

Defined in: [types/providers.ts:2073](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2073)

## Properties

### rawResponseParts

> **rawResponseParts**: `unknown`[]

Defined in: [types/providers.ts:2074](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2074)

---

### stepFunctionCalls

> **stepFunctionCalls**: [`NativeFunctionCall`](NativeFunctionCall.md)[]

Defined in: [types/providers.ts:2075](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2075)

---

### finishReason?

> `optional` **finishReason?**: `string`

Defined in: [types/providers.ts:2077](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2077)

Raw `Candidate.finishReason` from the last chunk that carried one.

---

### inputTokens

> **inputTokens**: `number`

Defined in: [types/providers.ts:2078](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2078)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/providers.ts:2079](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2079)

---

### cacheReadTokens?

> `optional` **cacheReadTokens?**: `number`

Defined in: [types/providers.ts:2085](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2085)

Gemini cached-content tokens (overlapping: included in promptTokenCount).
Surfaced so the call site can subtract from input and bill at cacheRead
rate. Subtraction happens at the call site, not in the collector.

---

### cacheCreationTokens?

> `optional` **cacheCreationTokens?**: `number`

Defined in: [types/providers.ts:2087](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2087)

Cache creation tokens (symmetry; Gemini does not emit this).

---

### reasoningTokens?

> `optional` **reasoningTokens?**: `number`

Defined in: [types/providers.ts:2093](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2093)

Gemini thinking tokens (usageMetadata.thoughtsTokenCount). Billed at the
output rate but NOT included in candidatesTokenCount — Gemini reports
totalTokenCount = prompt + candidates + thoughts.
