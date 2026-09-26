[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ConflictDetectionPlugin

# Type Alias: ConflictDetectionPlugin

> **ConflictDetectionPlugin** = `object`

Plugin-based conflict detection system
Extensible and configurable enhancement conflict resolution

## Properties

### name

> **name**: `string`

Plugin name for identification

---

### version

> **version**: `string`

Plugin version for compatibility checks

## Methods

### detectConflict()

> **detectConflict**(`enhancementA`, `enhancementB`, `optionsA?`, `optionsB?`): `boolean`

Check if two enhancement types conflict

#### Parameters

##### enhancementA

[`EnhancementType`](EnhancementType.md)

##### enhancementB

[`EnhancementType`](EnhancementType.md)

##### optionsA?

[`EnhancementOptions`](EnhancementOptions.md)

##### optionsB?

[`EnhancementOptions`](EnhancementOptions.md)

#### Returns

`boolean`

---

### getConflictSeverity()?

> `optional` **getConflictSeverity**(`enhancementA`, `enhancementB`): `"low"` \| `"medium"` \| `"high"`

Get conflict severity (low, medium, high)

#### Parameters

##### enhancementA

[`EnhancementType`](EnhancementType.md)

##### enhancementB

[`EnhancementType`](EnhancementType.md)

#### Returns

`"low"` \| `"medium"` \| `"high"`

---

### suggestResolution()?

> `optional` **suggestResolution**(`enhancementA`, `enhancementB`): `string`[]

Suggest resolution strategies

#### Parameters

##### enhancementA

[`EnhancementType`](EnhancementType.md)

##### enhancementB

[`EnhancementType`](EnhancementType.md)

#### Returns

`string`[]
