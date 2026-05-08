[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / PipelineResult

# Type Alias: PipelineResult

> **PipelineResult** = [`AggregatedScores`](AggregatedScores.md) & `object`

Defined in: [types/evaluation.ts:347](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L347)

Pipeline execution result

## Type Declaration

### pipelineConfig

> **pipelineConfig**: [`PipelineConfig`](PipelineConfig.md)

Pipeline configuration used

### executionOptions?

> `optional` **executionOptions?**: [`PipelineExecutionOptions`](PipelineExecutionOptions.md)

Execution options used

### errors

> **errors**: `object`[]

Errors that occurred during execution

### skippedScorers

> **skippedScorers**: `string`[]

Scorers that were skipped
