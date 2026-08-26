[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DiagnosticResult

# Type Alias: DiagnosticResult

> **DiagnosticResult** = `object`

Defined in: [types/providers.ts:2298](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2298)

Individual SageMaker diagnostic result.

## Properties

### name

> **name**: `string`

Defined in: [types/providers.ts:2299](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2299)

---

### category

> **category**: `"configuration"` \| `"connectivity"` \| `"streaming"`

Defined in: [types/providers.ts:2300](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2300)

---

### status

> **status**: `"pass"` \| `"fail"` \| `"warning"`

Defined in: [types/providers.ts:2301](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2301)

---

### message

> **message**: `string`

Defined in: [types/providers.ts:2302](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2302)

---

### details?

> `optional` **details?**: `string`

Defined in: [types/providers.ts:2303](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2303)

---

### recommendation?

> `optional` **recommendation?**: `string`

Defined in: [types/providers.ts:2304](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2304)
