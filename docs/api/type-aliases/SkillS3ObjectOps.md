[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SkillS3ObjectOps

# Type Alias: SkillS3ObjectOps

> **SkillS3ObjectOps** = `object`

Minimal object-storage operations the S3 skill store runs on. The
default implementation is created lazily from @aws-sdk/client-s3;
tests and hosts with pre-built clients can inject their own.

## Methods

### getObject()

> **getObject**(`key`): `Promise`\<`string` \| `null`\>

Fetch an object's body as a UTF-8 string. Null when the key is absent.

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`string` \| `null`\>

---

### putObject()

> **putObject**(`key`, `body`): `Promise`\<`void`\>

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

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`void`\>

---

### listKeys()

> **listKeys**(`prefix`): `Promise`\<`string`[]\>

List all object keys under a prefix (paginated internally).

#### Parameters

##### prefix

`string`

#### Returns

`Promise`\<`string`[]\>

---

### getObjectConditional()?

> `optional` **getObjectConditional**(`key`, `etag?`): `Promise`\<[`SkillS3ConditionalGetResult`](SkillS3ConditionalGetResult.md)\>

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
