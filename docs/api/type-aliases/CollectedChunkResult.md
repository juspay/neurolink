[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CollectedChunkResult

# Type Alias: CollectedChunkResult

> **CollectedChunkResult** = `object`

Defined in: [types/providers.ts:2132](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2132)

## Properties

### rawResponseParts

> **rawResponseParts**: `unknown`[]

Defined in: [types/providers.ts:2133](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2133)

---

### stepFunctionCalls

> **stepFunctionCalls**: [`NativeFunctionCall`](NativeFunctionCall.md)[]

Defined in: [types/providers.ts:2134](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2134)

---

### finishReason?

> `optional` **finishReason?**: `string`

Defined in: [types/providers.ts:2136](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2136)

Raw `Candidate.finishReason` from the last chunk that carried one.

---

### inputTokens

> **inputTokens**: `number`

Defined in: [types/providers.ts:2137](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2137)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/providers.ts:2138](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2138)

---

### cacheReadTokens?

> `optional` **cacheReadTokens?**: `number`

Defined in: [types/providers.ts:2144](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2144)

Gemini cached-content tokens (overlapping: included in promptTokenCount).
Surfaced so the call site can subtract from input and bill at cacheRead
rate. Subtraction happens at the call site, not in the collector.

---

### cacheCreationTokens?

> `optional` **cacheCreationTokens?**: `number`

Defined in: [types/providers.ts:2146](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2146)

Cache creation tokens (symmetry; Gemini does not emit this).

---

### reasoningTokens?

> `optional` **reasoningTokens?**: `number`

Defined in: [types/providers.ts:2152](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2152)

Gemini thinking tokens (usageMetadata.thoughtsTokenCount). Billed at the
output rate but NOT included in candidatesTokenCount — Gemini reports
totalTokenCount = prompt + candidates + thoughts.
