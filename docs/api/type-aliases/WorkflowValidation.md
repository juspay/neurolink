[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / WorkflowValidation

# Type Alias: WorkflowValidation\<T\>

> **WorkflowValidation**\<`T`\> = `object`

Defined in: [types/workflow.ts:801](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/workflow.ts#L801)

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

Defined in: [types/workflow.ts:802](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/workflow.ts#L802)

---

### data?

> `optional` **data?**: `T`

Defined in: [types/workflow.ts:803](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/workflow.ts#L803)

---

### error?

> `optional` **error?**: `z.ZodError`

Defined in: [types/workflow.ts:804](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/workflow.ts#L804)
