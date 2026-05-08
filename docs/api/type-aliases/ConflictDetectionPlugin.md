[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ConflictDetectionPlugin

# Type Alias: ConflictDetectionPlugin

> **ConflictDetectionPlugin** = `object`

Defined in: [types/utilities.ts:179](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/utilities.ts#L179)

Plugin-based conflict detection system
Extensible and configurable enhancement conflict resolution

## Properties

### name

> **name**: `string`

Defined in: [types/utilities.ts:181](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/utilities.ts#L181)

Plugin name for identification

---

### version

> **version**: `string`

Defined in: [types/utilities.ts:183](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/utilities.ts#L183)

Plugin version for compatibility checks

## Methods

### detectConflict()

> **detectConflict**(`enhancementA`, `enhancementB`, `optionsA?`, `optionsB?`): `boolean`

Defined in: [types/utilities.ts:185](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/utilities.ts#L185)

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

Defined in: [types/utilities.ts:192](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/utilities.ts#L192)

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

Defined in: [types/utilities.ts:197](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/utilities.ts#L197)

Suggest resolution strategies

#### Parameters

##### enhancementA

[`EnhancementType`](EnhancementType.md)

##### enhancementB

[`EnhancementType`](EnhancementType.md)

#### Returns

`string`[]
