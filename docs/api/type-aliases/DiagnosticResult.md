[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DiagnosticResult

# Type Alias: DiagnosticResult

> **DiagnosticResult** = `object`

Defined in: [types/providers.ts:2417](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2417)

Individual SageMaker diagnostic result.

## Properties

### name

> **name**: `string`

Defined in: [types/providers.ts:2418](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2418)

---

### category

> **category**: `"configuration"` \| `"connectivity"` \| `"streaming"`

Defined in: [types/providers.ts:2419](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2419)

---

### status

> **status**: `"pass"` \| `"fail"` \| `"warning"`

Defined in: [types/providers.ts:2420](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2420)

---

### message

> **message**: `string`

Defined in: [types/providers.ts:2421](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2421)

---

### details?

> `optional` **details?**: `string`

Defined in: [types/providers.ts:2422](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2422)

---

### recommendation?

> `optional` **recommendation?**: `string`

Defined in: [types/providers.ts:2423](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2423)
