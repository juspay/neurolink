[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DiagnosticResult

# Type Alias: DiagnosticResult

> **DiagnosticResult** = `object`

Defined in: [types/providers.ts:2336](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2336)

Individual SageMaker diagnostic result.

## Properties

### name

> **name**: `string`

Defined in: [types/providers.ts:2337](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2337)

---

### category

> **category**: `"configuration"` \| `"connectivity"` \| `"streaming"`

Defined in: [types/providers.ts:2338](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2338)

---

### status

> **status**: `"pass"` \| `"fail"` \| `"warning"`

Defined in: [types/providers.ts:2339](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2339)

---

### message

> **message**: `string`

Defined in: [types/providers.ts:2340](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2340)

---

### details?

> `optional` **details?**: `string`

Defined in: [types/providers.ts:2341](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2341)

---

### recommendation?

> `optional` **recommendation?**: `string`

Defined in: [types/providers.ts:2342](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2342)
