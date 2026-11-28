[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderCompiledToolNameRules

# Type Alias: ProviderCompiledToolNameRules

> **ProviderCompiledToolNameRules** = `object`

Compiled tool-name rules: a validity check, a sanitizer and a de-duplicator.

## Properties

### isValid

> **isValid**: (`name`) => `boolean`

#### Parameters

##### name

`string`

#### Returns

`boolean`

---

### sanitize

> **sanitize**: (`name`) => `string`

#### Parameters

##### name

`string`

#### Returns

`string`

---

### unique

> **unique**: (`base`, `isTaken`) => `string`

`base`, or `base` cut short with `_2`, `_3`, … until `isTaken` says no.

#### Parameters

##### base

`string`

##### isTaken

(`name`) => `boolean`

#### Returns

`string`
