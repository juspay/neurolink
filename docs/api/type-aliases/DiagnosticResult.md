[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DiagnosticResult

# Type Alias: DiagnosticResult

> **DiagnosticResult** = `object`

Defined in: [types/providers.ts:2345](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2345)

Individual SageMaker diagnostic result.

## Properties

### name

> **name**: `string`

Defined in: [types/providers.ts:2346](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2346)

---

### category

> **category**: `"configuration"` \| `"connectivity"` \| `"streaming"`

Defined in: [types/providers.ts:2347](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2347)

---

### status

> **status**: `"pass"` \| `"fail"` \| `"warning"`

Defined in: [types/providers.ts:2348](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2348)

---

### message

> **message**: `string`

Defined in: [types/providers.ts:2349](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2349)

---

### details?

> `optional` **details?**: `string`

Defined in: [types/providers.ts:2350](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2350)

---

### recommendation?

> `optional` **recommendation?**: `string`

Defined in: [types/providers.ts:2351](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2351)
