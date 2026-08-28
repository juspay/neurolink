[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DiagnosticResult

# Type Alias: DiagnosticResult

> **DiagnosticResult** = `object`

Defined in: [types/providers.ts:2301](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2301)

Individual SageMaker diagnostic result.

## Properties

### name

> **name**: `string`

Defined in: [types/providers.ts:2302](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2302)

---

### category

> **category**: `"configuration"` \| `"connectivity"` \| `"streaming"`

Defined in: [types/providers.ts:2303](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2303)

---

### status

> **status**: `"pass"` \| `"fail"` \| `"warning"`

Defined in: [types/providers.ts:2304](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2304)

---

### message

> **message**: `string`

Defined in: [types/providers.ts:2305](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2305)

---

### details?

> `optional` **details?**: `string`

Defined in: [types/providers.ts:2306](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2306)

---

### recommendation?

> `optional` **recommendation?**: `string`

Defined in: [types/providers.ts:2307](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2307)
