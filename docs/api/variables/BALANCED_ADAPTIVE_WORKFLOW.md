[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / BALANCED_ADAPTIVE_WORKFLOW

# Variable: BALANCED_ADAPTIVE_WORKFLOW

> `const` **BALANCED_ADAPTIVE_WORKFLOW**: [`WorkflowConfig`](../type-aliases/WorkflowConfig.md)

Defined in: [workflow/workflows/adaptiveWorkflow.ts:275](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/workflow/workflows/adaptiveWorkflow.ts#L275)

Balanced Adaptive Workflow

Balances speed, cost, and quality:

1. Standard tier (parallel): GPT-4o-mini + Gemini Flash
2. Premium tier (parallel): GPT-4o + Claude 3.5 if standard uncertain
