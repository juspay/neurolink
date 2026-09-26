[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StructuredRecoveryResult

# Type Alias: StructuredRecoveryResult

> **StructuredRecoveryResult** = `object`

Result of a structured recovery attempt.

## Properties

### data?

> `optional` **data?**: `unknown`

Schema-valid data, when any candidate survived validation.

---

### source?

> `optional` **source?**: [`StructuredRecoverySource`](StructuredRecoverySource.md)

Which ladder rung produced the winning candidate.

---

### errors

> **errors**: `string`[]

Validation error summaries per failed candidate (for re-ask prompts).
