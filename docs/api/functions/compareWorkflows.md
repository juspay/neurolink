[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / compareWorkflows

# Function: compareWorkflows()

> **compareWorkflows**(`workflow1Results`, `workflow2Results`): [`WorkflowComparison`](../type-aliases/WorkflowComparison.md)

Defined in: [workflow/utils/workflowMetrics.ts:341](https://github.com/juspay/neurolink/blob/release/src/lib/workflow/utils/workflowMetrics.ts#L341)

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
