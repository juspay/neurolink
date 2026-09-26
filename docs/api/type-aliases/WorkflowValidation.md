[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / WorkflowValidation

# Type Alias: WorkflowValidation\<T\>

> **WorkflowValidation**\<`T`\> = `object`

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

---

### data?

> `optional` **data?**: `T`

---

### error?

> `optional` **error?**: `z.ZodError`
