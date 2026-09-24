[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CollectedChunkResult

# Type Alias: CollectedChunkResult

> **CollectedChunkResult** = `object`

Defined in: [types/providers.ts:2151](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2151)

## Properties

### rawResponseParts

> **rawResponseParts**: `unknown`[]

Defined in: [types/providers.ts:2152](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2152)

---

### stepFunctionCalls

> **stepFunctionCalls**: [`NativeFunctionCall`](NativeFunctionCall.md)[]

Defined in: [types/providers.ts:2153](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2153)

---

### finishReason?

> `optional` **finishReason?**: `string`

Defined in: [types/providers.ts:2155](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2155)

Raw `Candidate.finishReason` from the last chunk that carried one.

---

### inputTokens

> **inputTokens**: `number`

Defined in: [types/providers.ts:2156](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2156)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/providers.ts:2157](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2157)

---

### cacheReadTokens?

> `optional` **cacheReadTokens?**: `number`

Defined in: [types/providers.ts:2163](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2163)

Gemini cached-content tokens (overlapping: included in promptTokenCount).
Surfaced so the call site can subtract from input and bill at cacheRead
rate. Subtraction happens at the call site, not in the collector.

---

### cacheCreationTokens?

> `optional` **cacheCreationTokens?**: `number`

Defined in: [types/providers.ts:2165](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2165)

Cache creation tokens (symmetry; Gemini does not emit this).

---

### reasoningTokens?

> `optional` **reasoningTokens?**: `number`

Defined in: [types/providers.ts:2171](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2171)

Gemini thinking tokens (usageMetadata.thoughtsTokenCount). Billed at the
output rate but NOT included in candidatesTokenCount — Gemini reports
totalTokenCount = prompt + candidates + thoughts.
