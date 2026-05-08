[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / TokenUsageStats

# Type Alias: TokenUsageStats

> **TokenUsageStats** = `object`

Defined in: [types/observability.ts:457](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L457)

Aggregated token usage statistics

## Properties

### totalInputTokens

> **totalInputTokens**: `number`

Defined in: [types/observability.ts:458](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L458)

---

### totalOutputTokens

> **totalOutputTokens**: `number`

Defined in: [types/observability.ts:459](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L459)

---

### totalTokens

> **totalTokens**: `number`

Defined in: [types/observability.ts:460](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L460)

---

### cacheReadTokens

> **cacheReadTokens**: `number`

Defined in: [types/observability.ts:461](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L461)

---

### cacheCreationTokens

> **cacheCreationTokens**: `number`

Defined in: [types/observability.ts:462](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L462)

---

### reasoningTokens

> **reasoningTokens**: `number`

Defined in: [types/observability.ts:463](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L463)

---

### totalCost

> **totalCost**: `number`

Defined in: [types/observability.ts:464](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L464)

---

### byProvider

> **byProvider**: `Map`\<`string`, [`ProviderTokenStats`](ProviderTokenStats.md)\>

Defined in: [types/observability.ts:465](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L465)

---

### byModel

> **byModel**: `Map`\<`string`, [`ModelTokenStats`](ModelTokenStats.md)\>

Defined in: [types/observability.ts:466](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L466)

---

### bySpanType

> **bySpanType**: `Map`\<`string`, `number`\>

Defined in: [types/observability.ts:467](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/observability.ts#L467)
