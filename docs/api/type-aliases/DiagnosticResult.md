[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DiagnosticResult

# Type Alias: DiagnosticResult

> **DiagnosticResult** = `object`

Defined in: [types/providers.ts:2426](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2426)

Individual SageMaker diagnostic result.

## Properties

### name

> **name**: `string`

Defined in: [types/providers.ts:2427](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2427)

---

### category

> **category**: `"configuration"` \| `"connectivity"` \| `"streaming"`

Defined in: [types/providers.ts:2428](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2428)

---

### status

> **status**: `"pass"` \| `"fail"` \| `"warning"`

Defined in: [types/providers.ts:2429](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2429)

---

### message

> **message**: `string`

Defined in: [types/providers.ts:2430](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2430)

---

### details?

> `optional` **details?**: `string`

Defined in: [types/providers.ts:2431](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2431)

---

### recommendation?

> `optional` **recommendation?**: `string`

Defined in: [types/providers.ts:2432](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2432)
