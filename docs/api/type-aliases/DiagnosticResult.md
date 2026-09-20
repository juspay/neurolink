[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DiagnosticResult

# Type Alias: DiagnosticResult

> **DiagnosticResult** = `object`

Defined in: [types/providers.ts:2392](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2392)

Individual SageMaker diagnostic result.

## Properties

### name

> **name**: `string`

Defined in: [types/providers.ts:2393](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2393)

---

### category

> **category**: `"configuration"` \| `"connectivity"` \| `"streaming"`

Defined in: [types/providers.ts:2394](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2394)

---

### status

> **status**: `"pass"` \| `"fail"` \| `"warning"`

Defined in: [types/providers.ts:2395](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2395)

---

### message

> **message**: `string`

Defined in: [types/providers.ts:2396](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2396)

---

### details?

> `optional` **details?**: `string`

Defined in: [types/providers.ts:2397](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2397)

---

### recommendation?

> `optional` **recommendation?**: `string`

Defined in: [types/providers.ts:2398](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2398)
