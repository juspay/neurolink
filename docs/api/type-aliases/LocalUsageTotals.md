[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LocalUsageTotals

# Type Alias: LocalUsageTotals

> **LocalUsageTotals** = `object`

Defined in: [types/localUsage.ts:131](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L131)

Aggregated totals for one CLI, one scan.

## Properties

### requests

> **requests**: `number`

Defined in: [types/localUsage.ts:132](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L132)

---

### inputTokens

> **inputTokens**: `number`

Defined in: [types/localUsage.ts:133](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L133)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/localUsage.ts:134](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L134)

---

### cacheReadTokens

> **cacheReadTokens**: `number`

Defined in: [types/localUsage.ts:135](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L135)

---

### cacheCreationTokens

> **cacheCreationTokens**: `number`

Defined in: [types/localUsage.ts:136](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L136)

---

### costUsd

> **costUsd**: `number`

Defined in: [types/localUsage.ts:137](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L137)

---

### costConfidence

> **costConfidence**: [`LocalUsageCostConfidence`](LocalUsageCostConfidence.md)

Defined in: [types/localUsage.ts:143](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L143)

The weakest confidence contributing to `costUsd`. A totals row mixing
modeled and heuristic entries must report the weaker one, otherwise the
aggregate looks better-sourced than its worst input.

---

### unpricedRequests

> **unpricedRequests**: `number`

Defined in: [types/localUsage.ts:145](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L145)

Turns whose model had no pricing entry, so contributed 0 to costUsd.

---

### unpricedModels

> **unpricedModels**: `string`[]

Defined in: [types/localUsage.ts:147](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L147)

Distinct model ids behind `unpricedRequests`, for diagnosis.
