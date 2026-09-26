[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StructuredRecoveryResult

# Type Alias: StructuredRecoveryResult

> **StructuredRecoveryResult** = `object`

Defined in: [types/isolatedAgent.ts:381](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L381)

Result of a structured recovery attempt.

## Properties

### data?

> `optional` **data?**: `unknown`

Defined in: [types/isolatedAgent.ts:383](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L383)

Schema-valid data, when any candidate survived validation.

---

### source?

> `optional` **source?**: [`StructuredRecoverySource`](StructuredRecoverySource.md)

Defined in: [types/isolatedAgent.ts:385](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L385)

Which ladder rung produced the winning candidate.

---

### errors

> **errors**: `string`[]

Defined in: [types/isolatedAgent.ts:387](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L387)

Validation error summaries per failed candidate (for re-ask prompts).
