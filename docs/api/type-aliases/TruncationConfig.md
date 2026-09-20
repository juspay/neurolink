[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TruncationConfig

# Type Alias: TruncationConfig

> **TruncationConfig** = `object`

Defined in: [types/context.ts:991](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L991)

Configuration for sliding window truncation (Stage 4).

## Properties

### fraction?

> `optional` **fraction?**: `number`

Defined in: [types/context.ts:992](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L992)

---

### currentTokens?

> `optional` **currentTokens?**: `number`

Defined in: [types/context.ts:994](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L994)

Current estimated tokens (enables adaptive mode)

---

### targetTokens?

> `optional` **targetTokens?**: `number`

Defined in: [types/context.ts:996](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L996)

Target token budget (enables adaptive mode)

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/context.ts:998](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L998)

Provider for token estimation (enables adaptive mode)

---

### adaptiveBuffer?

> `optional` **adaptiveBuffer?**: `number`

Defined in: [types/context.ts:1000](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L1000)

Buffer above required reduction (default: 0.15 = 15%)

---

### maxIterations?

> `optional` **maxIterations?**: `number`

Defined in: [types/context.ts:1002](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L1002)

Maximum iterations for adaptive truncation (default: 3)
