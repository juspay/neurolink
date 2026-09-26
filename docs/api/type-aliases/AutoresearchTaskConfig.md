[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AutoresearchTaskConfig

# Type Alias: AutoresearchTaskConfig

> **AutoresearchTaskConfig** = `object`

Configuration for autoresearch tasks.
Embedded in TaskDefinition/Task when type === "autoresearch".

## Properties

### repoPath

> **repoPath**: `string`

---

### mutablePaths

> **mutablePaths**: `string`[]

---

### runCommand

> **runCommand**: `string`

---

### metric

> **metric**: [`MetricConfig`](MetricConfig.md)

---

### immutablePaths?

> `optional` **immutablePaths?**: `string`[]

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

---

### maxExperiments?

> `optional` **maxExperiments?**: `number`

---

### provider?

> `optional` **provider?**: `string`

---

### model?

> `optional` **model?**: `string`

---

### thinkingLevel?

> `optional` **thinkingLevel?**: [`ThinkingLevel`](ThinkingLevel.md)

---

### maxBudgetUsd?

> `optional` **maxBudgetUsd?**: `number`

---

### programPath?

> `optional` **programPath?**: `string`

---

### resultsPath?

> `optional` **resultsPath?**: `string`

---

### statePath?

> `optional` **statePath?**: `string`

---

### logPath?

> `optional` **logPath?**: `string`

---

### branchPrefix?

> `optional` **branchPrefix?**: `string`

---

### memoryMetric?

> `optional` **memoryMetric?**: [`MemoryMetricConfig`](MemoryMetricConfig.md)
