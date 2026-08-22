[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BALANCED_ADAPTIVE_WORKFLOW

# Variable: BALANCED_ADAPTIVE_WORKFLOW

> `const` **BALANCED_ADAPTIVE_WORKFLOW**: [`WorkflowConfig`](../type-aliases/WorkflowConfig.md)

Defined in: [workflow/workflows/adaptiveWorkflow.ts:275](https://github.com/juspay/neurolink/blob/release/src/lib/workflow/workflows/adaptiveWorkflow.ts#L275)

Balanced Adaptive Workflow

Balances speed, cost, and quality:

1. Standard tier (parallel): GPT-4o-mini + Gemini Flash
2. Premium tier (parallel): GPT-4o + Claude 3.5 if standard uncertain
