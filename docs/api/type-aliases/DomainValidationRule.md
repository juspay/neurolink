[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DomainValidationRule

# Type Alias: DomainValidationRule

> **DomainValidationRule** = `object`

Domain validation rule

## Properties

### ruleName

> **ruleName**: `string`

---

### ruleType

> **ruleType**: `"required"` \| `"pattern"` \| `"range"` \| `"custom"`

---

### validation

> **validation**: (`value`) => `boolean`

#### Parameters

##### value

`unknown`

#### Returns

`boolean`

---

### errorMessage

> **errorMessage**: `string`
