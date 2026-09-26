[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SkillsManagerLike

# Type Alias: SkillsManagerLike

> **SkillsManagerLike** = `object`

Structural view of SkillsManager consumed by the skill tools factory —
keeps skillTools.ts decoupled from the concrete manager class.

## Properties

### search

> **search**: (`query`) => `Promise`\<[`SkillDefinition`](SkillDefinition.md)[]\>

#### Parameters

##### query

[`SkillSearchQuery`](SkillSearchQuery.md)

#### Returns

`Promise`\<[`SkillDefinition`](SkillDefinition.md)[]\>

---

### list

> **list**: (`scopeId?`) => `Promise`\<[`SkillIndexItem`](SkillIndexItem.md)[]\>

#### Parameters

##### scopeId?

`string`

#### Returns

`Promise`\<[`SkillIndexItem`](SkillIndexItem.md)[]\>

---

### get

> **get**: (`idOrName`) => `Promise`\<[`SkillDefinition`](SkillDefinition.md) \| `null`\>

#### Parameters

##### idOrName

`string`

#### Returns

`Promise`\<[`SkillDefinition`](SkillDefinition.md) \| `null`\>

---

### getResource

> **getResource**: (`idOrName`, `resourcePath`) => `Promise`\<`string` \| `null`\>

#### Parameters

##### idOrName

`string`

##### resourcePath

`string`

#### Returns

`Promise`\<`string` \| `null`\>

---

### sessions

> **sessions**: [`SkillSessionStateLike`](SkillSessionStateLike.md)

---

### requestMutation

> **requestMutation**: (`action`) => `Promise`\<[`SkillMutationResult`](SkillMutationResult.md)\>

#### Parameters

##### action

[`SkillMutationAction`](SkillMutationAction.md)

#### Returns

`Promise`\<[`SkillMutationResult`](SkillMutationResult.md)\>
