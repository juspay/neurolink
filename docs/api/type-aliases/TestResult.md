[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TestResult

# Type Alias: TestResult

> **TestResult** = `object`

Result of a single test execution.

## Properties

### name

> **name**: `string`

Display name of the test

---

### result

> **result**: `boolean`

Whether the test passed

---

### error

> **error**: `string` \| `null`

Error message if the test failed, null otherwise

---

### category?

> `optional` **category?**: `string`

Optional grouping category

---

### duration?

> `optional` **duration?**: `number`

Optional execution duration in milliseconds
