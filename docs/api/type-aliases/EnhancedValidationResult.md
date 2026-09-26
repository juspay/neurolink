[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / EnhancedValidationResult

# Type Alias: EnhancedValidationResult

> **EnhancedValidationResult** = `object`

Defined in: [types/tools.ts:646](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L646)

Result of a validation operation
Contains validation status, errors, warnings, and suggestions for improvement

## Properties

### isValid

> **isValid**: `boolean`

Defined in: [types/tools.ts:648](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L648)

Whether the validation passed without errors

---

### errors

> **errors**: `ValidationError`[]

Defined in: [types/tools.ts:650](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L650)

Array of validation errors that must be fixed

---

### warnings

> **warnings**: `string`[]

Defined in: [types/tools.ts:652](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L652)

Array of warning messages that should be addressed

---

### suggestions

> **suggestions**: [`StringArray`](StringArray.md)

Defined in: [types/tools.ts:654](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L654)

Array of suggestions to improve the validated object
