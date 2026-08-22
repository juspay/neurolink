[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AggregatedUsage

# Type Alias: AggregatedUsage

> **AggregatedUsage** = `object`

Defined in: [types/workflow.ts:398](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/workflow.ts#L398)

Aggregated token usage across all models

## Properties

### totalInputTokens

> **totalInputTokens**: `number`

Defined in: [types/workflow.ts:399](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/workflow.ts#L399)

---

### totalOutputTokens

> **totalOutputTokens**: `number`

Defined in: [types/workflow.ts:400](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/workflow.ts#L400)

---

### totalTokens

> **totalTokens**: `number`

Defined in: [types/workflow.ts:401](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/workflow.ts#L401)

---

### byModel

> **byModel**: `object`[]

Defined in: [types/workflow.ts:404](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/workflow.ts#L404)

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

Defined in: [types/workflow.ts:414](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/workflow.ts#L414)

#### inputTokens

> **inputTokens**: `number`

#### outputTokens

> **outputTokens**: `number`

#### totalTokens

> **totalTokens**: `number`

#### cost?

> `optional` **cost?**: `number`
