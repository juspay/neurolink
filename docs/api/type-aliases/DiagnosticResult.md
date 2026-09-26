[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DiagnosticResult

# Type Alias: DiagnosticResult

> **DiagnosticResult** = `object`

Individual SageMaker diagnostic result.

## Properties

### name

> **name**: `string`

---

### category

> **category**: `"configuration"` \| `"connectivity"` \| `"streaming"`

---

### status

> **status**: `"pass"` \| `"fail"` \| `"warning"`

---

### message

> **message**: `string`

---

### details?

> `optional` **details?**: `string`

---

### recommendation?

> `optional` **recommendation?**: `string`
