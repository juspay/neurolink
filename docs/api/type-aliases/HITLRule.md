[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / HITLRule

# Type Alias: HITLRule

> **HITLRule** = `object`

Defined in: [types/hitl.ts:43](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/hitl.ts#L43)

Custom rule for advanced HITL scenarios
Allows enterprises to define complex conditions for when tools require confirmation

## Properties

### name

> **name**: `string`

Defined in: [types/hitl.ts:45](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/hitl.ts#L45)

Human-readable name for the rule

---

### condition

> **condition**: (`toolName`, `args`) => `boolean`

Defined in: [types/hitl.ts:48](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/hitl.ts#L48)

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

Defined in: [types/hitl.ts:51](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/hitl.ts#L51)

Whether this rule requires confirmation when triggered

---

### customMessage?

> `optional` **customMessage?**: `string`

Defined in: [types/hitl.ts:54](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/hitl.ts#L54)

Custom message to show users when this rule is triggered
