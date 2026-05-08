[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / QUALITY_MAX_WORKFLOW

# Variable: QUALITY_MAX_WORKFLOW

> `const` **QUALITY_MAX_WORKFLOW**: [`WorkflowConfig`](../type-aliases/WorkflowConfig.md)

Defined in: [workflow/workflows/adaptiveWorkflow.ts:44](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/workflow/workflows/adaptiveWorkflow.ts#L44)

Quality-Max Adaptive Workflow

Uses 3-tier layer-based execution:

1. Validation tier (parallel): 2 fast models check complexity
2. Premium tier (parallel): 2 high-quality models if validation uncertain
3. Expert tier (sequential): Best model for final polish

Each tier evaluates if next tier is needed based on confidence

## Example

```typescript
import { runWorkflow } from "../core/workflowRunner.js";
import { QUALITY_MAX_WORKFLOW } from "./adaptiveWorkflow.js";

const result = await runWorkflow(QUALITY_MAX_WORKFLOW, {
  prompt: "Design a scalable microservices architecture",
  verbose: true,
});

console.log("Quality score:", result.score);
console.log("Tiers executed:", result.ensembleResponses.length);
```
