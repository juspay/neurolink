[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / createMultiJudgeWorkflow

# Function: createMultiJudgeWorkflow()

> **createMultiJudgeWorkflow**(`modelCount`, `judgeCount`): [`WorkflowConfig`](../type-aliases/WorkflowConfig.md)

Defined in: [workflow/workflows/multiJudgeWorkflow.ts:250](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/workflow/workflows/multiJudgeWorkflow.ts#L250)

Create custom multi-judge workflow

## Parameters

### modelCount

`3` \| `5` \| `7`

Number of models (3, 5, or 7)

### judgeCount

`2` \| `3`

Number of judges (2 or 3)

## Returns

[`WorkflowConfig`](../type-aliases/WorkflowConfig.md)

Configured workflow

## Example

```typescript
const workflow = createMultiJudgeWorkflow(7, 3);
const result = await runWorkflow(workflow, {
  prompt: "Complex analysis task",
});
```
