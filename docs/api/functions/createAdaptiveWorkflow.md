[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / createAdaptiveWorkflow

# Function: createAdaptiveWorkflow()

> **createAdaptiveWorkflow**(`tiers`, `strategy`): [`WorkflowConfig`](../type-aliases/WorkflowConfig.md)

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
