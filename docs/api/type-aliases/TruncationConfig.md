[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / TruncationConfig

# Type Alias: TruncationConfig

> **TruncationConfig** = `object`

Defined in: [types/context.ts:879](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L879)

Configuration for sliding window truncation (Stage 4).

## Properties

### fraction?

> `optional` **fraction?**: `number`

Defined in: [types/context.ts:880](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L880)

---

### currentTokens?

> `optional` **currentTokens?**: `number`

Defined in: [types/context.ts:882](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L882)

Current estimated tokens (enables adaptive mode)

---

### targetTokens?

> `optional` **targetTokens?**: `number`

Defined in: [types/context.ts:884](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L884)

Target token budget (enables adaptive mode)

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/context.ts:886](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L886)

Provider for token estimation (enables adaptive mode)

---

### adaptiveBuffer?

> `optional` **adaptiveBuffer?**: `number`

Defined in: [types/context.ts:888](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L888)

Buffer above required reduction (default: 0.15 = 15%)

---

### maxIterations?

> `optional` **maxIterations?**: `number`

Defined in: [types/context.ts:890](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L890)

Maximum iterations for adaptive truncation (default: 3)
