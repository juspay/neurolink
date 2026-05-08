[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / WorkflowValidation

# Type Alias: WorkflowValidation\<T\>

> **WorkflowValidation**\<`T`\> = `object`

Defined in: [types/workflow.ts:801](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L801)

Generic workflow validation result — replaces three near-identical types
(WorkflowConfigValidationResult, ModelConfigValidationResult,
JudgeConfigValidationResult). Named with `Workflow*` prefix to avoid
collision with `tools.ts#ValidationResult` (Rule 9).

## Type Parameters

### T

`T`

## Properties

### success

> **success**: `boolean`

Defined in: [types/workflow.ts:802](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L802)

---

### data?

> `optional` **data?**: `T`

Defined in: [types/workflow.ts:803](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L803)

---

### error?

> `optional` **error?**: `z.ZodError`

Defined in: [types/workflow.ts:804](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L804)
