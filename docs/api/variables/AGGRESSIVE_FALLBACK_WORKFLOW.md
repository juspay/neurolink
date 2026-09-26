[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AGGRESSIVE_FALLBACK_WORKFLOW

# Variable: AGGRESSIVE_FALLBACK_WORKFLOW

> `const` **AGGRESSIVE_FALLBACK_WORKFLOW**: [`WorkflowConfig`](../type-aliases/WorkflowConfig.md)

Aggressive Fallback Workflow

More aggressive fallback with parallel premium tier:

1. Fast tier: GPT-4o-mini (sequential)
2. Premium tier: GPT-4o + Claude 3.5 (parallel, both execute)

Guarantees high quality if fast tier fails
