[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / EnhancedValidationResult

# Type Alias: EnhancedValidationResult

> **EnhancedValidationResult** = `object`

Defined in: [types/tools.ts:599](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/tools.ts#L599)

Result of a validation operation
Contains validation status, errors, warnings, and suggestions for improvement

## Properties

### isValid

> **isValid**: `boolean`

Defined in: [types/tools.ts:601](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/tools.ts#L601)

Whether the validation passed without errors

---

### errors

> **errors**: `ValidationError`[]

Defined in: [types/tools.ts:603](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/tools.ts#L603)

Array of validation errors that must be fixed

---

### warnings

> **warnings**: `string`[]

Defined in: [types/tools.ts:605](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/tools.ts#L605)

Array of warning messages that should be addressed

---

### suggestions

> **suggestions**: [`StringArray`](StringArray.md)

Defined in: [types/tools.ts:607](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/tools.ts#L607)

Array of suggestions to improve the validated object
