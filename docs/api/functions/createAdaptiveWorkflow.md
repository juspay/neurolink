[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / createAdaptiveWorkflow

# Function: createAdaptiveWorkflow()

> **createAdaptiveWorkflow**(`tiers`, `strategy`): [`WorkflowConfig`](../type-aliases/WorkflowConfig.md)

Defined in: [workflow/workflows/adaptiveWorkflow.ts:375](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/workflow/workflows/adaptiveWorkflow.ts#L375)

Create custom adaptive workflow

## Parameters

### tiers

`2` \| `3`

Number of quality tiers (2, 3, or 4)

### strategy

`"speed"` \| `"quality"` \| `"balanced"`

'speed' | 'balanced' | 'quality'

## Returns

[`WorkflowConfig`](../type-aliases/WorkflowConfig.md)

Configured adaptive workflow

## Example

```typescript
const workflow = createAdaptiveWorkflow(3, "quality");
const result = await runWorkflow(workflow, {
  prompt: "Complex technical analysis",
});
```
