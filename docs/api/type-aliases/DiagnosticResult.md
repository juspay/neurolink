[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DiagnosticResult

# Type Alias: DiagnosticResult

> **DiagnosticResult** = `object`

Defined in: [types/providers.ts:2319](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2319)

Individual SageMaker diagnostic result.

## Properties

### name

> **name**: `string`

Defined in: [types/providers.ts:2320](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2320)

---

### category

> **category**: `"configuration"` \| `"connectivity"` \| `"streaming"`

Defined in: [types/providers.ts:2321](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2321)

---

### status

> **status**: `"pass"` \| `"fail"` \| `"warning"`

Defined in: [types/providers.ts:2322](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2322)

---

### message

> **message**: `string`

Defined in: [types/providers.ts:2323](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2323)

---

### details?

> `optional` **details?**: `string`

Defined in: [types/providers.ts:2324](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2324)

---

### recommendation?

> `optional` **recommendation?**: `string`

Defined in: [types/providers.ts:2325](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2325)
