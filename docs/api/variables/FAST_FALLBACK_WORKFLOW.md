[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / FAST_FALLBACK_WORKFLOW

# Variable: FAST_FALLBACK_WORKFLOW

> `const` **FAST_FALLBACK_WORKFLOW**: [`WorkflowConfig`](../type-aliases/WorkflowConfig.md)

Defined in: [workflow/workflows/fallbackWorkflow.ts:43](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/workflow/workflows/fallbackWorkflow.ts#L43)

Fast-Fallback Workflow Configuration

Uses layer-based execution with sequential groups:

1. Fast tier: GPT-4o-mini (try first)
2. Mid tier: Gemini 2.0 Flash (if fast fails)
3. Premium tier: GPT-4o or Claude 3.5 Sonnet (last resort)

Each group runs sequentially - only proceeds if previous fails

## Example

```typescript
import { runWorkflow } from "../core/workflowRunner.js";
import { FAST_FALLBACK_WORKFLOW } from "./fallbackWorkflow.js";

const result = await runWorkflow(FAST_FALLBACK_WORKFLOW, {
  prompt: "What is 2+2?",
  verbose: true,
});

// Usually completes with fast tier, saving cost
console.log("Executed models:", result.ensembleResponses.length);
```
