[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / AutoresearchTaskConfig

# Type Alias: AutoresearchTaskConfig

> **AutoresearchTaskConfig** = `object`

Defined in: [types/task.ts:28](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L28)

Configuration for autoresearch tasks.
Embedded in TaskDefinition/Task when type === "autoresearch".

## Properties

### repoPath

> **repoPath**: `string`

Defined in: [types/task.ts:29](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L29)

---

### mutablePaths

> **mutablePaths**: `string`[]

Defined in: [types/task.ts:30](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L30)

---

### runCommand

> **runCommand**: `string`

Defined in: [types/task.ts:31](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L31)

---

### metric

> **metric**: [`MetricConfig`](MetricConfig.md)

Defined in: [types/task.ts:32](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L32)

---

### immutablePaths?

> `optional` **immutablePaths?**: `string`[]

Defined in: [types/task.ts:33](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L33)

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Defined in: [types/task.ts:34](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L34)

---

### maxExperiments?

> `optional` **maxExperiments?**: `number`

Defined in: [types/task.ts:35](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L35)

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/task.ts:36](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L36)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/task.ts:37](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L37)

---

### thinkingLevel?

> `optional` **thinkingLevel?**: [`ThinkingLevel`](ThinkingLevel.md)

Defined in: [types/task.ts:38](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L38)

---

### maxBudgetUsd?

> `optional` **maxBudgetUsd?**: `number`

Defined in: [types/task.ts:39](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L39)

---

### programPath?

> `optional` **programPath?**: `string`

Defined in: [types/task.ts:42](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L42)

---

### resultsPath?

> `optional` **resultsPath?**: `string`

Defined in: [types/task.ts:43](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L43)

---

### statePath?

> `optional` **statePath?**: `string`

Defined in: [types/task.ts:44](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L44)

---

### logPath?

> `optional` **logPath?**: `string`

Defined in: [types/task.ts:45](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L45)

---

### branchPrefix?

> `optional` **branchPrefix?**: `string`

Defined in: [types/task.ts:46](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L46)

---

### memoryMetric?

> `optional` **memoryMetric?**: [`MemoryMetricConfig`](MemoryMetricConfig.md)

Defined in: [types/task.ts:47](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L47)
