[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MULTI_JUDGE_5_WORKFLOW

# Variable: MULTI_JUDGE_5_WORKFLOW

> `const` **MULTI_JUDGE_5_WORKFLOW**: [`WorkflowConfig`](../type-aliases/WorkflowConfig.md)

Multi-Judge-5 Workflow Configuration

Uses 5 models across different providers:

- GPT-4o (OpenAI)
- GPT-4o-mini (OpenAI)
- Claude Sonnet 4.6 (Anthropic)
- Claude Haiku 4.5 (Anthropic)
- Gemini 3.8 Flash (Google)

3 independent judges vote:

- GPT-4o evaluates accuracy & clarity
- Claude Sonnet 4.6 evaluates reasoning & depth
- Gemini 3.8 Flash evaluates completeness & coherence

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
