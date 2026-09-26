[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ValidationIssue

# Type Alias: ValidationIssue

> **ValidationIssue** = `object`

## Properties

### category

> **category**: `string`

Short machine-readable category (e.g., "length", "json_schema", "phrase")

---

### severity

> **severity**: `"error"` \| `"warning"` \| `"info"`

---

### message

> **message**: `string`

---

### field?

> `optional` **field?**: `string`

Optional field path (useful for JSON schema errors)
