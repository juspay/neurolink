[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TruncationConfig

# Type Alias: TruncationConfig

> **TruncationConfig** = `object`

Defined in: [types/context.ts:989](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L989)

Configuration for sliding window truncation (Stage 4).

## Properties

### fraction?

> `optional` **fraction?**: `number`

Defined in: [types/context.ts:990](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L990)

---

### currentTokens?

> `optional` **currentTokens?**: `number`

Defined in: [types/context.ts:992](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L992)

Current estimated tokens (enables adaptive mode)

---

### targetTokens?

> `optional` **targetTokens?**: `number`

Defined in: [types/context.ts:994](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L994)

Target token budget (enables adaptive mode)

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/context.ts:996](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L996)

Provider for token estimation (enables adaptive mode)

---

### adaptiveBuffer?

> `optional` **adaptiveBuffer?**: `number`

Defined in: [types/context.ts:998](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L998)

Buffer above required reduction (default: 0.15 = 15%)

---

### maxIterations?

> `optional` **maxIterations?**: `number`

Defined in: [types/context.ts:1000](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L1000)

Maximum iterations for adaptive truncation (default: 3)
