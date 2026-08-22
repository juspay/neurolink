[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / DomainValidationRule

# Type Alias: DomainValidationRule

> **DomainValidationRule** = `object`

Defined in: [types/domain.ts:62](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/domain.ts#L62)

Domain validation rule

## Properties

### ruleName

> **ruleName**: `string`

Defined in: [types/domain.ts:63](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/domain.ts#L63)

---

### ruleType

> **ruleType**: `"required"` \| `"pattern"` \| `"range"` \| `"custom"`

Defined in: [types/domain.ts:64](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/domain.ts#L64)

---

### validation

> **validation**: (`value`) => `boolean`

Defined in: [types/domain.ts:65](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/domain.ts#L65)

#### Parameters

##### value

`unknown`

#### Returns

`boolean`

---

### errorMessage

> **errorMessage**: `string`

Defined in: [types/domain.ts:66](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/domain.ts#L66)
