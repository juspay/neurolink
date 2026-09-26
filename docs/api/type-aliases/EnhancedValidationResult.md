[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / EnhancedValidationResult

# Type Alias: EnhancedValidationResult

> **EnhancedValidationResult** = `object`

Result of a validation operation
Contains validation status, errors, warnings, and suggestions for improvement

## Properties

### isValid

> **isValid**: `boolean`

Whether the validation passed without errors

---

### errors

> **errors**: `ValidationError`[]

Array of validation errors that must be fixed

---

### warnings

> **warnings**: `string`[]

Array of warning messages that should be addressed

---

### suggestions

> **suggestions**: [`StringArray`](StringArray.md)

Array of suggestions to improve the validated object
