[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CollectedChunkResult

# Type Alias: CollectedChunkResult

> **CollectedChunkResult** = `object`

Defined in: [types/providers.ts:2078](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2078)

## Properties

### rawResponseParts

> **rawResponseParts**: `unknown`[]

Defined in: [types/providers.ts:2079](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2079)

---

### stepFunctionCalls

> **stepFunctionCalls**: [`NativeFunctionCall`](NativeFunctionCall.md)[]

Defined in: [types/providers.ts:2080](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2080)

---

### finishReason?

> `optional` **finishReason?**: `string`

Defined in: [types/providers.ts:2082](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2082)

Raw `Candidate.finishReason` from the last chunk that carried one.

---

### inputTokens

> **inputTokens**: `number`

Defined in: [types/providers.ts:2083](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2083)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/providers.ts:2084](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2084)

---

### cacheReadTokens?

> `optional` **cacheReadTokens?**: `number`

Defined in: [types/providers.ts:2090](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2090)

Gemini cached-content tokens (overlapping: included in promptTokenCount).
Surfaced so the call site can subtract from input and bill at cacheRead
rate. Subtraction happens at the call site, not in the collector.

---

### cacheCreationTokens?

> `optional` **cacheCreationTokens?**: `number`

Defined in: [types/providers.ts:2092](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2092)

Cache creation tokens (symmetry; Gemini does not emit this).

---

### reasoningTokens?

> `optional` **reasoningTokens?**: `number`

Defined in: [types/providers.ts:2098](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2098)

Gemini thinking tokens (usageMetadata.thoughtsTokenCount). Billed at the
output rate but NOT included in candidatesTokenCount — Gemini reports
totalTokenCount = prompt + candidates + thoughts.
