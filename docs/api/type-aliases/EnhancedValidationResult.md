[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / EnhancedValidationResult

# Type Alias: EnhancedValidationResult

> **EnhancedValidationResult** = `object`

Defined in: [types/tools.ts:582](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L582)

Result of a validation operation
Contains validation status, errors, warnings, and suggestions for improvement

## Properties

### isValid

> **isValid**: `boolean`

Defined in: [types/tools.ts:584](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L584)

Whether the validation passed without errors

---

### errors

> **errors**: `ValidationError`[]

Defined in: [types/tools.ts:586](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L586)

Array of validation errors that must be fixed

---

### warnings

> **warnings**: `string`[]

Defined in: [types/tools.ts:588](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L588)

Array of warning messages that should be addressed

---

### suggestions

> **suggestions**: [`StringArray`](StringArray.md)

Defined in: [types/tools.ts:590](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L590)

Array of suggestions to improve the validated object
