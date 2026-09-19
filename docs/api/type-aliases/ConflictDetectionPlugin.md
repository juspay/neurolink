[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ConflictDetectionPlugin

# Type Alias: ConflictDetectionPlugin

> **ConflictDetectionPlugin** = `object`

Defined in: [types/utilities.ts:193](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L193)

Plugin-based conflict detection system
Extensible and configurable enhancement conflict resolution

## Properties

### name

> **name**: `string`

Defined in: [types/utilities.ts:195](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L195)

Plugin name for identification

---

### version

> **version**: `string`

Defined in: [types/utilities.ts:197](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L197)

Plugin version for compatibility checks

## Methods

### detectConflict()

> **detectConflict**(`enhancementA`, `enhancementB`, `optionsA?`, `optionsB?`): `boolean`

Defined in: [types/utilities.ts:199](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L199)

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

Defined in: [types/utilities.ts:206](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L206)

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

Defined in: [types/utilities.ts:211](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L211)

Suggest resolution strategies

#### Parameters

##### enhancementA

[`EnhancementType`](EnhancementType.md)

##### enhancementB

[`EnhancementType`](EnhancementType.md)

#### Returns

`string`[]
