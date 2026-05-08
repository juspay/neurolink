[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / MULTI_JUDGE_5_WORKFLOW

# Variable: MULTI_JUDGE_5_WORKFLOW

> `const` **MULTI_JUDGE_5_WORKFLOW**: [`WorkflowConfig`](../type-aliases/WorkflowConfig.md)

Defined in: [workflow/workflows/multiJudgeWorkflow.ts:50](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/workflow/workflows/multiJudgeWorkflow.ts#L50)

Multi-Judge-5 Workflow Configuration

Uses 5 models across different providers:

- GPT-4o (OpenAI)
- GPT-4o-mini (OpenAI)
- Claude 3.5 Sonnet (Anthropic)
- Claude 3 Haiku (Anthropic)
- Gemini 2.0 Flash (Google)

3 independent judges vote:

- GPT-4o evaluates accuracy & clarity
- Claude 3.5 Sonnet evaluates reasoning & depth
- Gemini 2.0 Flash evaluates completeness & coherence

Scores are averaged across all judges for final selection

## Example

```typescript
import { runWorkflow } from "../core/workflowRunner.js";
import { MULTI_JUDGE_5_WORKFLOW } from "./multiJudgeWorkflow.js";

const result = await runWorkflow(MULTI_JUDGE_5_WORKFLOW, {
  prompt: "Should we invest in renewable energy?",
  verbose: true,
});

console.log("Consensus score:", result.score);
console.log("Agreement level:", result.consensus);
```
