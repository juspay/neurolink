[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ConfirmationResult

# Type Alias: ConfirmationResult

> **ConfirmationResult** = `object`

Result of a confirmation request
Contains user decision and potentially modified arguments

## Properties

### approved

> **approved**: `boolean`

Whether the user approved the tool execution

---

### reason?

> `optional` **reason?**: `string`

Optional reason for rejection (if approved is false)

---

### modifiedArguments?

> `optional` **modifiedArguments?**: `unknown`

User-modified arguments (if allowArgumentModification is enabled)

---

### responseTime

> **responseTime**: `number`

Time taken for user to respond in milliseconds
