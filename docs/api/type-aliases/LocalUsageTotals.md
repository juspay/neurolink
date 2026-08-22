[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LocalUsageTotals

# Type Alias: LocalUsageTotals

> **LocalUsageTotals** = `object`

Defined in: [types/localUsage.ts:56](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L56)

Aggregated totals for one CLI, one scan.

## Properties

### requests

> **requests**: `number`

Defined in: [types/localUsage.ts:57](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L57)

---

### inputTokens

> **inputTokens**: `number`

Defined in: [types/localUsage.ts:58](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L58)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/localUsage.ts:59](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L59)

---

### cacheReadTokens

> **cacheReadTokens**: `number`

Defined in: [types/localUsage.ts:60](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L60)

---

### cacheCreationTokens

> **cacheCreationTokens**: `number`

Defined in: [types/localUsage.ts:61](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L61)

---

### costUsd

> **costUsd**: `number`

Defined in: [types/localUsage.ts:62](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L62)

---

### costConfidence

> **costConfidence**: [`LocalUsageCostConfidence`](LocalUsageCostConfidence.md)

Defined in: [types/localUsage.ts:68](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L68)

The weakest confidence contributing to `costUsd`. A totals row mixing
modeled and heuristic entries must report the weaker one, otherwise the
aggregate looks better-sourced than its worst input.

---

### unpricedRequests

> **unpricedRequests**: `number`

Defined in: [types/localUsage.ts:70](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L70)

Turns whose model had no pricing entry, so contributed 0 to costUsd.

---

### unpricedModels

> **unpricedModels**: `string`[]

Defined in: [types/localUsage.ts:72](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L72)

Distinct model ids behind `unpricedRequests`, for diagnosis.
