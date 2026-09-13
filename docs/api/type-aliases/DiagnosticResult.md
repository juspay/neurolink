[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DiagnosticResult

# Type Alias: DiagnosticResult

> **DiagnosticResult** = `object`

Defined in: [types/providers.ts:2306](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2306)

Individual SageMaker diagnostic result.

## Properties

### name

> **name**: `string`

Defined in: [types/providers.ts:2307](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2307)

---

### category

> **category**: `"configuration"` \| `"connectivity"` \| `"streaming"`

Defined in: [types/providers.ts:2308](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2308)

---

### status

> **status**: `"pass"` \| `"fail"` \| `"warning"`

Defined in: [types/providers.ts:2309](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2309)

---

### message

> **message**: `string`

Defined in: [types/providers.ts:2310](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2310)

---

### details?

> `optional` **details?**: `string`

Defined in: [types/providers.ts:2311](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2311)

---

### recommendation?

> `optional` **recommendation?**: `string`

Defined in: [types/providers.ts:2312](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2312)
