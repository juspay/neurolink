[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / compareWorkflows

# Function: compareWorkflows()

> **compareWorkflows**(`workflow1Results`, `workflow2Results`): [`WorkflowComparison`](../type-aliases/WorkflowComparison.md)

Defined in: [workflow/utils/workflowMetrics.ts:341](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/workflow/utils/workflowMetrics.ts#L341)

Compare two workflows based on metrics

## Parameters

### workflow1Results

[`WorkflowResult`](../type-aliases/WorkflowResult.md)[]

Results from first workflow

### workflow2Results

[`WorkflowResult`](../type-aliases/WorkflowResult.md)[]

Results from second workflow

## Returns

[`WorkflowComparison`](../type-aliases/WorkflowComparison.md)

Comparison with stats for both workflows and winner determination
