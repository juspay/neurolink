[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / compareWorkflows

# Function: compareWorkflows()

> **compareWorkflows**(`workflow1Results`, `workflow2Results`): [`WorkflowComparison`](../type-aliases/WorkflowComparison.md)

Defined in: [workflow/utils/workflowMetrics.ts:341](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/workflow/utils/workflowMetrics.ts#L341)

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
