[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / EnhancedValidationResult

# Type Alias: EnhancedValidationResult

> **EnhancedValidationResult** = `object`

Defined in: [types/tools.ts:633](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L633)

Result of a validation operation
Contains validation status, errors, warnings, and suggestions for improvement

## Properties

### isValid

> **isValid**: `boolean`

Defined in: [types/tools.ts:635](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L635)

Whether the validation passed without errors

---

### errors

> **errors**: `ValidationError`[]

Defined in: [types/tools.ts:637](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L637)

Array of validation errors that must be fixed

---

### warnings

> **warnings**: `string`[]

Defined in: [types/tools.ts:639](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L639)

Array of warning messages that should be addressed

---

### suggestions

> **suggestions**: [`StringArray`](StringArray.md)

Defined in: [types/tools.ts:641](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L641)

Array of suggestions to improve the validated object
