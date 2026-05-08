[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / AggregatedUsage

# Type Alias: AggregatedUsage

> **AggregatedUsage** = `object`

Defined in: [types/workflow.ts:398](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L398)

Aggregated token usage across all models

## Properties

### totalInputTokens

> **totalInputTokens**: `number`

Defined in: [types/workflow.ts:399](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L399)

---

### totalOutputTokens

> **totalOutputTokens**: `number`

Defined in: [types/workflow.ts:400](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L400)

---

### totalTokens

> **totalTokens**: `number`

Defined in: [types/workflow.ts:401](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L401)

---

### byModel

> **byModel**: `object`[]

Defined in: [types/workflow.ts:404](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L404)

#### provider

> **provider**: `string`

#### model

> **model**: `string`

#### inputTokens

> **inputTokens**: `number`

#### outputTokens

> **outputTokens**: `number`

#### totalTokens

> **totalTokens**: `number`

#### cost?

> `optional` **cost?**: `number`

---

### judgeUsage?

> `optional` **judgeUsage?**: `object`

Defined in: [types/workflow.ts:414](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L414)

#### inputTokens

> **inputTokens**: `number`

#### outputTokens

> **outputTokens**: `number`

#### totalTokens

> **totalTokens**: `number`

#### cost?

> `optional` **cost?**: `number`
