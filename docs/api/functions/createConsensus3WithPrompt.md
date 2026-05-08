[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / createConsensus3WithPrompt

# Function: createConsensus3WithPrompt()

> **createConsensus3WithPrompt**(`systemPrompt`): [`WorkflowConfig`](../type-aliases/WorkflowConfig.md)

Defined in: [workflow/workflows/consensusWorkflow.ts:129](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/workflow/workflows/consensusWorkflow.ts#L129)

Consensus-3 with Custom System Prompt

Same as CONSENSUS_3_WORKFLOW but allows custom system prompt

## Parameters

### systemPrompt

`string`

Custom system prompt for all models

## Returns

[`WorkflowConfig`](../type-aliases/WorkflowConfig.md)

Workflow configuration with custom prompt

## Example

```typescript
const workflow = createConsensus3WithPrompt(
  "You are a technical expert. Provide detailed, accurate responses.",
);

const result = await runWorkflow(workflow, {
  prompt: "Explain async/await in JavaScript",
});
```
