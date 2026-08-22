[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / runWorkflow

# Function: runWorkflow()

> **runWorkflow**(`config`, `options`): `Promise`\<[`WorkflowResult`](../type-aliases/WorkflowResult.md)\>

Defined in: [workflow/core/workflowRunner.ts:74](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/workflow/core/workflowRunner.ts#L74)

Execute a complete workflow

This is the main entry point that orchestrates:

- Model execution (respects modelGroups or flat models)
- Judge scoring (with hierarchical prompt resolution)
- Response conditioning (currently stub)
- Metrics calculation
- Result assembly

## Parameters

### config

[`WorkflowConfig`](../type-aliases/WorkflowConfig.md)

Validated workflow configuration

### options

[`RunWorkflowOptions`](../type-aliases/RunWorkflowOptions.md)

Execution options including prompt

## Returns

`Promise`\<[`WorkflowResult`](../type-aliases/WorkflowResult.md)\>

Complete workflow result with scores and metrics

## Example

```typescript
const result = await runWorkflow(config, {
  prompt: "Explain quantum entanglement",
  timeout: 30000,
  verbose: true,
});

console.log("Best response:", result.content);
console.log("Score:", result.score);
```
