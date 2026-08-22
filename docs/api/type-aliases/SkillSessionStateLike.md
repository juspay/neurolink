[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SkillSessionStateLike

# Type Alias: SkillSessionStateLike

> **SkillSessionStateLike** = `object`

Defined in: [types/skills.ts:383](https://github.com/juspay/neurolink/blob/release/src/lib/types/skills.ts#L383)

Structural view of the per-session activation tracker consumed by the
skill tools factory.

## Properties

### isActive

> **isActive**: (`sessionId`, `skillId`, `name`) => `boolean`

Defined in: [types/skills.ts:384](https://github.com/juspay/neurolink/blob/release/src/lib/types/skills.ts#L384)

#### Parameters

##### sessionId

`string`

##### skillId

`string`

##### name

`string`

#### Returns

`boolean`

---

### getActivation

> **getActivation**: (`sessionId`, `skillId`, `name?`) => [`SkillActivationRecord`](SkillActivationRecord.md) \| `undefined`

Defined in: [types/skills.ts:385](https://github.com/juspay/neurolink/blob/release/src/lib/types/skills.ts#L385)

#### Parameters

##### sessionId

`string`

##### skillId

`string`

##### name?

`string`

#### Returns

[`SkillActivationRecord`](SkillActivationRecord.md) \| `undefined`

---

### recordActivation

> **recordActivation**: (`sessionId`, `skill`) => [`ChatMessage`](ChatMessage.md)

Defined in: [types/skills.ts:390](https://github.com/juspay/neurolink/blob/release/src/lib/types/skills.ts#L390)

#### Parameters

##### sessionId

`string`

##### skill

[`SkillDefinition`](SkillDefinition.md)

#### Returns

[`ChatMessage`](ChatMessage.md)

---

### hydrate

> **hydrate**: (`sessionId`, `storedMessages`) => `void`

Defined in: [types/skills.ts:391](https://github.com/juspay/neurolink/blob/release/src/lib/types/skills.ts#L391)

#### Parameters

##### sessionId

`string`

##### storedMessages

[`ChatMessage`](ChatMessage.md)[]

#### Returns

`void`
