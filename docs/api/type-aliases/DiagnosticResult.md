[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DiagnosticResult

# Type Alias: DiagnosticResult

> **DiagnosticResult** = `object`

Defined in: [types/providers.ts:2279](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2279)

Individual SageMaker diagnostic result.

## Properties

### name

> **name**: `string`

Defined in: [types/providers.ts:2280](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2280)

---

### category

> **category**: `"configuration"` \| `"connectivity"` \| `"streaming"`

Defined in: [types/providers.ts:2281](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2281)

---

### status

> **status**: `"pass"` \| `"fail"` \| `"warning"`

Defined in: [types/providers.ts:2282](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2282)

---

### message

> **message**: `string`

Defined in: [types/providers.ts:2283](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2283)

---

### details?

> `optional` **details?**: `string`

Defined in: [types/providers.ts:2284](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2284)

---

### recommendation?

> `optional` **recommendation?**: `string`

Defined in: [types/providers.ts:2285](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2285)
