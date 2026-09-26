[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / S3SkillStore

# Class: S3SkillStore

## Implements

- [`SkillStore`](../type-aliases/SkillStore.md)

## Constructors

### Constructor

> **new S3SkillStore**(`config`, `injectedOps?`): `S3SkillStore`

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

Optional: drop any internal caches (called after mutations).

#### Returns

`void`

#### Implementation of

`SkillStore.invalidate`

---

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
