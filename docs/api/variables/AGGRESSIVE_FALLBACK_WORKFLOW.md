[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AGGRESSIVE_FALLBACK_WORKFLOW

# Variable: AGGRESSIVE_FALLBACK_WORKFLOW

> `const` **AGGRESSIVE_FALLBACK_WORKFLOW**: [`WorkflowConfig`](../type-aliases/WorkflowConfig.md)

Defined in: [workflow/workflows/fallbackWorkflow.ts:157](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/workflow/workflows/fallbackWorkflow.ts#L157)

Aggressive Fallback Workflow

More aggressive fallback with parallel premium tier:

1. Fast tier: GPT-4o-mini (sequential)
2. Premium tier: GPT-4o + Claude 3.5 (parallel, both execute)

Guarantees high quality if fast tier fails
