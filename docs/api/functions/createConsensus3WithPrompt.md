[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / createConsensus3WithPrompt

# Function: createConsensus3WithPrompt()

> **createConsensus3WithPrompt**(`systemPrompt`): [`WorkflowConfig`](../type-aliases/WorkflowConfig.md)

Defined in: [workflow/workflows/consensusWorkflow.ts:129](https://github.com/juspay/neurolink/blob/release/src/lib/workflow/workflows/consensusWorkflow.ts#L129)

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
