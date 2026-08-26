[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / EnhancedValidationResult

# Type Alias: EnhancedValidationResult

> **EnhancedValidationResult** = `object`

Defined in: [types/tools.ts:610](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L610)

Result of a validation operation
Contains validation status, errors, warnings, and suggestions for improvement

## Properties

### isValid

> **isValid**: `boolean`

Defined in: [types/tools.ts:612](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L612)

Whether the validation passed without errors

---

### errors

> **errors**: `ValidationError`[]

Defined in: [types/tools.ts:614](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L614)

Array of validation errors that must be fixed

---

### warnings

> **warnings**: `string`[]

Defined in: [types/tools.ts:616](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L616)

Array of warning messages that should be addressed

---

### suggestions

> **suggestions**: [`StringArray`](StringArray.md)

Defined in: [types/tools.ts:618](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L618)

Array of suggestions to improve the validated object
