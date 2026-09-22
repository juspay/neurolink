[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DiagnosticResult

# Type Alias: DiagnosticResult

> **DiagnosticResult** = `object`

Defined in: [types/providers.ts:2397](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2397)

Individual SageMaker diagnostic result.

## Properties

### name

> **name**: `string`

Defined in: [types/providers.ts:2398](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2398)

---

### category

> **category**: `"configuration"` \| `"connectivity"` \| `"streaming"`

Defined in: [types/providers.ts:2399](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2399)

---

### status

> **status**: `"pass"` \| `"fail"` \| `"warning"`

Defined in: [types/providers.ts:2400](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2400)

---

### message

> **message**: `string`

Defined in: [types/providers.ts:2401](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2401)

---

### details?

> `optional` **details?**: `string`

Defined in: [types/providers.ts:2402](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2402)

---

### recommendation?

> `optional` **recommendation?**: `string`

Defined in: [types/providers.ts:2403](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2403)
