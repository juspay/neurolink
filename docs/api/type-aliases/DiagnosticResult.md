[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DiagnosticResult

# Type Alias: DiagnosticResult

> **DiagnosticResult** = `object`

Defined in: [types/providers.ts:2329](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2329)

Individual SageMaker diagnostic result.

## Properties

### name

> **name**: `string`

Defined in: [types/providers.ts:2330](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2330)

---

### category

> **category**: `"configuration"` \| `"connectivity"` \| `"streaming"`

Defined in: [types/providers.ts:2331](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2331)

---

### status

> **status**: `"pass"` \| `"fail"` \| `"warning"`

Defined in: [types/providers.ts:2332](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2332)

---

### message

> **message**: `string`

Defined in: [types/providers.ts:2333](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2333)

---

### details?

> `optional` **details?**: `string`

Defined in: [types/providers.ts:2334](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2334)

---

### recommendation?

> `optional` **recommendation?**: `string`

Defined in: [types/providers.ts:2335](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2335)
