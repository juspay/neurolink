[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TruncationConfig

# Type Alias: TruncationConfig

> **TruncationConfig** = `object`

Defined in: [types/context.ts:1012](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L1012)

Configuration for sliding window truncation (Stage 4).

## Properties

### fraction?

> `optional` **fraction?**: `number`

Defined in: [types/context.ts:1013](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L1013)

---

### currentTokens?

> `optional` **currentTokens?**: `number`

Defined in: [types/context.ts:1015](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L1015)

Current estimated tokens (enables adaptive mode)

---

### targetTokens?

> `optional` **targetTokens?**: `number`

Defined in: [types/context.ts:1017](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L1017)

Target token budget (enables adaptive mode)

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/context.ts:1019](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L1019)

Provider for token estimation (enables adaptive mode)

---

### adaptiveBuffer?

> `optional` **adaptiveBuffer?**: `number`

Defined in: [types/context.ts:1021](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L1021)

Buffer above required reduction (default: 0.15 = 15%)

---

### maxIterations?

> `optional` **maxIterations?**: `number`

Defined in: [types/context.ts:1023](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L1023)

Maximum iterations for adaptive truncation (default: 3)
