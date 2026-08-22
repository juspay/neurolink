[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / CONSENSUS_3_WORKFLOW

# Variable: CONSENSUS_3_WORKFLOW

> `const` **CONSENSUS_3_WORKFLOW**: [`WorkflowConfig`](../type-aliases/WorkflowConfig.md)

Defined in: [workflow/workflows/consensusWorkflow.ts:44](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/workflow/workflows/consensusWorkflow.ts#L44)

Consensus-3 Workflow Configuration

Uses 3 high-quality models in parallel:

- GPT-4o (OpenAI) - Strong reasoning
- Claude 3.5 Sonnet (Anthropic) - Thoughtful analysis
- Gemini 2.0 Flash (Google) - Fast and capable

Judge: GPT-4o evaluates on accuracy, clarity, and completeness

## Example

```typescript
import { runWorkflow } from "../core/workflowRunner.js";
import { CONSENSUS_3_WORKFLOW } from "./consensusWorkflow.js";

const result = await runWorkflow(CONSENSUS_3_WORKFLOW, {
  prompt: "Explain the theory of relativity",
  verbose: true,
});

console.log("Best response:", result.content);
console.log("Score:", result.score);
console.log("Reasoning:", result.reasoning);
```
