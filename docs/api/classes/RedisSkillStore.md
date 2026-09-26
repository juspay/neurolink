[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RedisSkillStore

# Class: RedisSkillStore

## Implements

- [`SkillStore`](../type-aliases/SkillStore.md)

## Constructors

### Constructor

> **new RedisSkillStore**(`config`): `RedisSkillStore`

#### Parameters

##### config

[`SkillRedisStorageConfig`](../type-aliases/SkillRedisStorageConfig.md)

#### Returns

`RedisSkillStore`

## Methods

### getResource()

> **getResource**(`id`, `resourcePath`): `Promise`\<`string` \| `null`\>

Optional: fetch an auxiliary resource file bundled with a skill.
`resourcePath` is relative to the skill (e.g. "references/forms.md").
Null when the skill or resource is absent. Stores without resource
support simply omit this method.

#### Parameters

##### id

`string`

##### resourcePath

`string`

#### Returns

`Promise`\<`string` \| `null`\>

#### Implementation of

`SkillStore.getResource`

---

### get()

> **get**(`id`): `Promise`\<[`SkillDefinition`](../type-aliases/SkillDefinition.md) \| `null`\>

Fetch one skill (with instructions) by id. Null when absent.

#### Parameters

##### id

`string`

#### Returns

`Promise`\<[`SkillDefinition`](../type-aliases/SkillDefinition.md) \| `null`\>

#### Implementation of

`SkillStore.get`

---

### put()

> **put**(`skill`): `Promise`\<`void`\>

Create or replace a skill.

#### Parameters

##### skill

[`SkillDefinition`](../type-aliases/SkillDefinition.md)

#### Returns

`Promise`\<`void`\>

#### Implementation of

`SkillStore.put`

---

### delete()

> **delete**(`id`): `Promise`\<`void`\>

Hard-remove a skill from storage. (Soft deletes go through put().)

#### Parameters

##### id

`string`

#### Returns

`Promise`\<`void`\>

#### Implementation of

`SkillStore.delete`

---

### index()

> **index**(): `Promise`\<[`SkillIndexItem`](../type-aliases/SkillIndexItem.md)[]\>

List index entries (no instructions) for all stored skills.

#### Returns

`Promise`\<[`SkillIndexItem`](../type-aliases/SkillIndexItem.md)[]\>

#### Implementation of

`SkillStore.index`
