[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DiagnosticResult

# Type Alias: DiagnosticResult

> **DiagnosticResult** = `object`

Defined in: [types/providers.ts:2464](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2464)

Individual SageMaker diagnostic result.

## Properties

### name

> **name**: `string`

Defined in: [types/providers.ts:2465](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2465)

---

### category

> **category**: `"configuration"` \| `"connectivity"` \| `"streaming"`

Defined in: [types/providers.ts:2466](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2466)

---

### status

> **status**: `"pass"` \| `"fail"` \| `"warning"`

Defined in: [types/providers.ts:2467](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2467)

---

### message

> **message**: `string`

Defined in: [types/providers.ts:2468](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2468)

---

### details?

> `optional` **details?**: `string`

Defined in: [types/providers.ts:2469](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2469)

---

### recommendation?

> `optional` **recommendation?**: `string`

Defined in: [types/providers.ts:2470](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2470)
