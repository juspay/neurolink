[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / HITLRule

# Type Alias: HITLRule

> **HITLRule** = `object`

Custom rule for advanced HITL scenarios
Allows enterprises to define complex conditions for when tools require confirmation

## Properties

### name

> **name**: `string`

Human-readable name for the rule

---

### condition

> **condition**: (`toolName`, `args`) => `boolean`

Function that determines if a tool requires confirmation

#### Parameters

##### toolName

`string`

##### args

`unknown`

#### Returns

`boolean`

---

### requiresConfirmation

> **requiresConfirmation**: `boolean`

Whether this rule requires confirmation when triggered

---

### customMessage?

> `optional` **customMessage?**: `string`

Custom message to show users when this rule is triggered
