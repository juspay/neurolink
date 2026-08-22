[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PipelineResult

# Type Alias: PipelineResult

> **PipelineResult** = [`AggregatedScores`](AggregatedScores.md) & `object`

Defined in: [types/evaluation.ts:342](https://github.com/juspay/neurolink/blob/release/src/lib/types/evaluation.ts#L342)

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
