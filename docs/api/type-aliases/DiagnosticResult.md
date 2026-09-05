[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DiagnosticResult

# Type Alias: DiagnosticResult

> **DiagnosticResult** = `object`

Defined in: [types/providers.ts:2331](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2331)

Individual SageMaker diagnostic result.

## Properties

### name

> **name**: `string`

Defined in: [types/providers.ts:2332](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2332)

---

### category

> **category**: `"configuration"` \| `"connectivity"` \| `"streaming"`

Defined in: [types/providers.ts:2333](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2333)

---

### status

> **status**: `"pass"` \| `"fail"` \| `"warning"`

Defined in: [types/providers.ts:2334](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2334)

---

### message

> **message**: `string`

Defined in: [types/providers.ts:2335](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2335)

---

### details?

> `optional` **details?**: `string`

Defined in: [types/providers.ts:2336](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2336)

---

### recommendation?

> `optional` **recommendation?**: `string`

Defined in: [types/providers.ts:2337](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2337)
