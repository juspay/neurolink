[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ResponseValidationResult

# Type Alias: ResponseValidationResult

> **ResponseValidationResult** = `object`

## Properties

### text

> **text**: `string`

Possibly-mutated response text (truncation may shorten it)

---

### action

> **action**: `"continue"` \| `"abort"` \| `"retry"`

What the caller should do next

---

### issues

> **issues**: [`ValidationIssue`](ValidationIssue.md)[]

All issues found during validation

---

### feedback?

> `optional` **feedback?**: `string`

Human-readable summary suitable for inclusion in a retry prompt

---

### retryCount?

> `optional` **retryCount?**: `number`

The retryCount that was passed in (echoed back for convenience)
