[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / SPEED_FIRST_WORKFLOW

# Variable: SPEED_FIRST_WORKFLOW

> `const` **SPEED_FIRST_WORKFLOW**: [`WorkflowConfig`](../type-aliases/WorkflowConfig.md)

Defined in: [workflow/workflows/adaptiveWorkflow.ts:180](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/workflow/workflows/adaptiveWorkflow.ts#L180)

Speed-First Adaptive Workflow

Optimizes for speed with quality fallback:

1. Fast tier: Single fast model (GPT-4o-mini)
2. Balanced tier: If fast fails, use Gemini 2.0
3. Quality tier: If both fail, use GPT-4o
