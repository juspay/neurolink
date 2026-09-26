[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DiagnosticResult

# Type Alias: DiagnosticResult

> **DiagnosticResult** = `object`

Defined in: [types/providers.ts:2400](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2400)

Individual SageMaker diagnostic result.

## Properties

### name

> **name**: `string`

Defined in: [types/providers.ts:2401](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2401)

---

### category

> **category**: `"configuration"` \| `"connectivity"` \| `"streaming"`

Defined in: [types/providers.ts:2402](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2402)

---

### status

> **status**: `"pass"` \| `"fail"` \| `"warning"`

Defined in: [types/providers.ts:2403](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2403)

---

### message

> **message**: `string`

Defined in: [types/providers.ts:2404](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2404)

---

### details?

> `optional` **details?**: `string`

Defined in: [types/providers.ts:2405](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2405)

---

### recommendation?

> `optional` **recommendation?**: `string`

Defined in: [types/providers.ts:2406](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2406)
