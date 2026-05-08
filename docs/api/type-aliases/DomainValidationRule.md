[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / DomainValidationRule

# Type Alias: DomainValidationRule

> **DomainValidationRule** = `object`

Defined in: [types/domain.ts:62](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/domain.ts#L62)

Domain validation rule

## Properties

### ruleName

> **ruleName**: `string`

Defined in: [types/domain.ts:63](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/domain.ts#L63)

---

### ruleType

> **ruleType**: `"required"` \| `"pattern"` \| `"range"` \| `"custom"`

Defined in: [types/domain.ts:64](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/domain.ts#L64)

---

### validation

> **validation**: (`value`) => `boolean`

Defined in: [types/domain.ts:65](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/domain.ts#L65)

#### Parameters

##### value

`unknown`

#### Returns

`boolean`

---

### errorMessage

> **errorMessage**: `string`

Defined in: [types/domain.ts:66](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/domain.ts#L66)
