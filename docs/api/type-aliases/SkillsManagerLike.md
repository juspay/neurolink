[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / SkillsManagerLike

# Type Alias: SkillsManagerLike

> **SkillsManagerLike** = `object`

Defined in: [types/skills.ts:398](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/skills.ts#L398)

Structural view of SkillsManager consumed by the skill tools factory —
keeps skillTools.ts decoupled from the concrete manager class.

## Properties

### search

> **search**: (`query`) => `Promise`\<[`SkillDefinition`](SkillDefinition.md)[]\>

Defined in: [types/skills.ts:399](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/skills.ts#L399)

#### Parameters

##### query

[`SkillSearchQuery`](SkillSearchQuery.md)

#### Returns

`Promise`\<[`SkillDefinition`](SkillDefinition.md)[]\>

---

### list

> **list**: (`scopeId?`) => `Promise`\<[`SkillIndexItem`](SkillIndexItem.md)[]\>

Defined in: [types/skills.ts:400](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/skills.ts#L400)

#### Parameters

##### scopeId?

`string`

#### Returns

`Promise`\<[`SkillIndexItem`](SkillIndexItem.md)[]\>

---

### get

> **get**: (`idOrName`) => `Promise`\<[`SkillDefinition`](SkillDefinition.md) \| `null`\>

Defined in: [types/skills.ts:401](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/skills.ts#L401)

#### Parameters

##### idOrName

`string`

#### Returns

`Promise`\<[`SkillDefinition`](SkillDefinition.md) \| `null`\>

---

### getResource

> **getResource**: (`idOrName`, `resourcePath`) => `Promise`\<`string` \| `null`\>

Defined in: [types/skills.ts:402](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/skills.ts#L402)

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

Defined in: [types/skills.ts:406](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/skills.ts#L406)

---

### requestMutation

> **requestMutation**: (`action`) => `Promise`\<[`SkillMutationResult`](SkillMutationResult.md)\>

Defined in: [types/skills.ts:407](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/skills.ts#L407)

#### Parameters

##### action

[`SkillMutationAction`](SkillMutationAction.md)

#### Returns

`Promise`\<[`SkillMutationResult`](SkillMutationResult.md)\>
