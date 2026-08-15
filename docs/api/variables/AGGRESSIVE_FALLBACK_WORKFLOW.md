[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AGGRESSIVE_FALLBACK_WORKFLOW

# Variable: AGGRESSIVE_FALLBACK_WORKFLOW

> `const` **AGGRESSIVE_FALLBACK_WORKFLOW**: [`WorkflowConfig`](../type-aliases/WorkflowConfig.md)

Defined in: [workflow/workflows/fallbackWorkflow.ts:157](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/workflow/workflows/fallbackWorkflow.ts#L157)

Aggressive Fallback Workflow

More aggressive fallback with parallel premium tier:

1. Fast tier: GPT-4o-mini (sequential)
2. Premium tier: GPT-4o + Claude 3.5 (parallel, both execute)

Guarantees high quality if fast tier fails
