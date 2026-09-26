[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PipelineResult

# Type Alias: PipelineResult

> **PipelineResult** = [`AggregatedScores`](AggregatedScores.md) & `object`

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
