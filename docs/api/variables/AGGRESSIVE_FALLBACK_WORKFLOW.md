[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / AGGRESSIVE_FALLBACK_WORKFLOW

# Variable: AGGRESSIVE_FALLBACK_WORKFLOW

> `const` **AGGRESSIVE_FALLBACK_WORKFLOW**: [`WorkflowConfig`](../type-aliases/WorkflowConfig.md)

Defined in: [workflow/workflows/fallbackWorkflow.ts:157](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/workflow/workflows/fallbackWorkflow.ts#L157)

Aggressive Fallback Workflow

More aggressive fallback with parallel premium tier:

1. Fast tier: GPT-4o-mini (sequential)
2. Premium tier: GPT-4o + Claude 3.5 (parallel, both execute)

Guarantees high quality if fast tier fails
