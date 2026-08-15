[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / SkillS3ObjectOps

# Type Alias: SkillS3ObjectOps

> **SkillS3ObjectOps** = `object`

Defined in: [types/skills.ts:218](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/skills.ts#L218)

Minimal object-storage operations the S3 skill store runs on. The
default implementation is created lazily from @aws-sdk/client-s3;
tests and hosts with pre-built clients can inject their own.

## Methods

### getObject()

> **getObject**(`key`): `Promise`\<`string` \| `null`\>

Defined in: [types/skills.ts:220](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/skills.ts#L220)

Fetch an object's body as a UTF-8 string. Null when the key is absent.

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`string` \| `null`\>

---

### putObject()

> **putObject**(`key`, `body`): `Promise`\<`void`\>

Defined in: [types/skills.ts:221](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/skills.ts#L221)

#### Parameters

##### key

`string`

##### body

`string`

#### Returns

`Promise`\<`void`\>

---

### deleteObject()

> **deleteObject**(`key`): `Promise`\<`void`\>

Defined in: [types/skills.ts:222](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/skills.ts#L222)

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`void`\>

---

### listKeys()

> **listKeys**(`prefix`): `Promise`\<`string`[]\>

Defined in: [types/skills.ts:224](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/skills.ts#L224)

List all object keys under a prefix (paginated internally).

#### Parameters

##### prefix

`string`

#### Returns

`Promise`\<`string`[]\>

---

### getObjectConditional()?

> `optional` **getObjectConditional**(`key`, `etag?`): `Promise`\<[`SkillS3ConditionalGetResult`](SkillS3ConditionalGetResult.md)\>

Defined in: [types/skills.ts:230](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/skills.ts#L230)

Optional: ETag-conditional read (If-None-Match). Used for index.json
refreshes so an unchanged index costs a 304 instead of a full download.
Ops without it fall back to plain getObject.

#### Parameters

##### key

`string`

##### etag?

`string`

#### Returns

`Promise`\<[`SkillS3ConditionalGetResult`](SkillS3ConditionalGetResult.md)\>
