[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / StructuredRecoveryResult

# Type Alias: StructuredRecoveryResult

> **StructuredRecoveryResult** = `object`

Defined in: [types/isolatedAgent.ts:372](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/isolatedAgent.ts#L372)

Result of a structured recovery attempt.

## Properties

### data?

> `optional` **data?**: `unknown`

Defined in: [types/isolatedAgent.ts:374](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/isolatedAgent.ts#L374)

Schema-valid data, when any candidate survived validation.

---

### source?

> `optional` **source?**: [`StructuredRecoverySource`](StructuredRecoverySource.md)

Defined in: [types/isolatedAgent.ts:376](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/isolatedAgent.ts#L376)

Which ladder rung produced the winning candidate.

---

### errors

> **errors**: `string`[]

Defined in: [types/isolatedAgent.ts:378](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/isolatedAgent.ts#L378)

Validation error summaries per failed candidate (for re-ask prompts).
