[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LocalUsageTotals

# Type Alias: LocalUsageTotals

> **LocalUsageTotals** = `object`

Aggregated totals for one CLI, one scan.

## Properties

### requests

> **requests**: `number`

---

### inputTokens

> **inputTokens**: `number`

---

### outputTokens

> **outputTokens**: `number`

---

### cacheReadTokens

> **cacheReadTokens**: `number`

---

### cacheCreationTokens

> **cacheCreationTokens**: `number`

---

### costUsd

> **costUsd**: `number`

---

### costConfidence

> **costConfidence**: [`LocalUsageCostConfidence`](LocalUsageCostConfidence.md)

The weakest confidence contributing to `costUsd`. A totals row mixing
modeled and heuristic entries must report the weaker one, otherwise the
aggregate looks better-sourced than its worst input.

---

### unpricedRequests

> **unpricedRequests**: `number`

Turns whose model had no pricing entry, so contributed 0 to costUsd.

---

### unpricedModels

> **unpricedModels**: `string`[]

Distinct model ids behind `unpricedRequests`, for diagnosis.
