[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / S3SkillStore

# Class: S3SkillStore

Defined in: [skills/skillStoreS3.ts:168](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/skills/skillStoreS3.ts#L168)

## Implements

- [`SkillStore`](../type-aliases/SkillStore.md)

## Constructors

### Constructor

> **new S3SkillStore**(`config`, `injectedOps?`): `S3SkillStore`

Defined in: [skills/skillStoreS3.ts:175](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/skills/skillStoreS3.ts#L175)

#### Parameters

##### config

[`SkillS3StorageConfig`](../type-aliases/SkillS3StorageConfig.md)

##### injectedOps?

[`SkillS3ObjectOps`](../type-aliases/SkillS3ObjectOps.md)

Test/host seam — omit to build ops from @aws-sdk/client-s3 lazily.

#### Returns

`S3SkillStore`

## Methods

### invalidate()

> **invalidate**(): `void`

Defined in: [skills/skillStoreS3.ts:185](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/skills/skillStoreS3.ts#L185)

Optional: drop any internal caches (called after mutations).

#### Returns

`void`

#### Implementation of

`SkillStore.invalidate`

---

### getResource()

> **getResource**(`id`, `resourcePath`): `Promise`\<`string` \| `null`\>

Defined in: [skills/skillStoreS3.ts:210](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/skills/skillStoreS3.ts#L210)

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

Defined in: [skills/skillStoreS3.ts:217](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/skills/skillStoreS3.ts#L217)

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

Defined in: [skills/skillStoreS3.ts:233](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/skills/skillStoreS3.ts#L233)

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

Defined in: [skills/skillStoreS3.ts:250](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/skills/skillStoreS3.ts#L250)

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

Defined in: [skills/skillStoreS3.ts:258](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/skills/skillStoreS3.ts#L258)

List index entries (no instructions) for all stored skills.

#### Returns

`Promise`\<[`SkillIndexItem`](../type-aliases/SkillIndexItem.md)[]\>

#### Implementation of

`SkillStore.index`
