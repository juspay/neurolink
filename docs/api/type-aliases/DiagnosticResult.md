[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DiagnosticResult

# Type Alias: DiagnosticResult

> **DiagnosticResult** = `object`

Defined in: [types/providers.ts:2314](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2314)

Individual SageMaker diagnostic result.

## Properties

### name

> **name**: `string`

Defined in: [types/providers.ts:2315](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2315)

---

### category

> **category**: `"configuration"` \| `"connectivity"` \| `"streaming"`

Defined in: [types/providers.ts:2316](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2316)

---

### status

> **status**: `"pass"` \| `"fail"` \| `"warning"`

Defined in: [types/providers.ts:2317](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2317)

---

### message

> **message**: `string`

Defined in: [types/providers.ts:2318](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2318)

---

### details?

> `optional` **details?**: `string`

Defined in: [types/providers.ts:2319](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2319)

---

### recommendation?

> `optional` **recommendation?**: `string`

Defined in: [types/providers.ts:2320](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2320)
