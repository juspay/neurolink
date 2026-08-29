[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LocalUsageTotals

# Type Alias: LocalUsageTotals

> **LocalUsageTotals** = `object`

Defined in: [types/localUsage.ts:67](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L67)

Aggregated totals for one CLI, one scan.

## Properties

### requests

> **requests**: `number`

Defined in: [types/localUsage.ts:68](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L68)

---

### inputTokens

> **inputTokens**: `number`

Defined in: [types/localUsage.ts:69](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L69)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/localUsage.ts:70](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L70)

---

### cacheReadTokens

> **cacheReadTokens**: `number`

Defined in: [types/localUsage.ts:71](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L71)

---

### cacheCreationTokens

> **cacheCreationTokens**: `number`

Defined in: [types/localUsage.ts:72](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L72)

---

### costUsd

> **costUsd**: `number`

Defined in: [types/localUsage.ts:73](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L73)

---

### costConfidence

> **costConfidence**: [`LocalUsageCostConfidence`](LocalUsageCostConfidence.md)

Defined in: [types/localUsage.ts:79](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L79)

The weakest confidence contributing to `costUsd`. A totals row mixing
modeled and heuristic entries must report the weaker one, otherwise the
aggregate looks better-sourced than its worst input.

---

### unpricedRequests

> **unpricedRequests**: `number`

Defined in: [types/localUsage.ts:81](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L81)

Turns whose model had no pricing entry, so contributed 0 to costUsd.

---

### unpricedModels

> **unpricedModels**: `string`[]

Defined in: [types/localUsage.ts:83](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L83)

Distinct model ids behind `unpricedRequests`, for diagnosis.
