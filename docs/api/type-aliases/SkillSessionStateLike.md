[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SkillSessionStateLike

# Type Alias: SkillSessionStateLike

> **SkillSessionStateLike** = `object`

Structural view of the per-session activation tracker consumed by the
skill tools factory.

## Properties

### isActive

> **isActive**: (`sessionId`, `skillId`, `name`) => `boolean`

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

#### Parameters

##### sessionId

`string`

##### storedMessages

[`ChatMessage`](ChatMessage.md)[]

#### Returns

`void`
