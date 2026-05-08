[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / SPEED_FIRST_WORKFLOW

# Variable: SPEED_FIRST_WORKFLOW

> `const` **SPEED_FIRST_WORKFLOW**: [`WorkflowConfig`](../type-aliases/WorkflowConfig.md)

Defined in: [workflow/workflows/adaptiveWorkflow.ts:180](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/workflow/workflows/adaptiveWorkflow.ts#L180)

Speed-First Adaptive Workflow

Optimizes for speed with quality fallback:

1. Fast tier: Single fast model (GPT-4o-mini)
2. Balanced tier: If fast fails, use Gemini 2.0
3. Quality tier: If both fail, use GPT-4o
