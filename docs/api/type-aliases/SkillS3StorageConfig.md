[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SkillS3StorageConfig

# Type Alias: SkillS3StorageConfig

> **SkillS3StorageConfig** = `object`

Defined in: [types/skills.ts:147](https://github.com/juspay/neurolink/blob/release/src/lib/types/skills.ts#L147)

S3-backed store. Layout: `<prefix>skills/<id>.json` per skill plus a
`<prefix>index.json` document that is upserted on writes and rebuilt
from a bucket listing when missing or corrupt (self-healing).

Requires the optional peer `@aws-sdk/client-s3` to be installed in the
host application (same pattern as memory's optional @juspay/hippocampus).
Credentials default to the standard AWS provider chain when omitted.

## Properties

### type

> **type**: `"s3"`

Defined in: [types/skills.ts:148](https://github.com/juspay/neurolink/blob/release/src/lib/types/skills.ts#L148)

---

### bucket

> **bucket**: `string`

Defined in: [types/skills.ts:149](https://github.com/juspay/neurolink/blob/release/src/lib/types/skills.ts#L149)

---

### prefix?

> `optional` **prefix?**: `string`

Defined in: [types/skills.ts:151](https://github.com/juspay/neurolink/blob/release/src/lib/types/skills.ts#L151)

Key prefix inside the bucket. Default: "neurolink-skills/".

---

### region?

> `optional` **region?**: `string`

Defined in: [types/skills.ts:152](https://github.com/juspay/neurolink/blob/release/src/lib/types/skills.ts#L152)

---

### endpoint?

> `optional` **endpoint?**: `string`

Defined in: [types/skills.ts:154](https://github.com/juspay/neurolink/blob/release/src/lib/types/skills.ts#L154)

Custom endpoint (MinIO, LocalStack, …).

---

### forcePathStyle?

> `optional` **forcePathStyle?**: `boolean`

Defined in: [types/skills.ts:156](https://github.com/juspay/neurolink/blob/release/src/lib/types/skills.ts#L156)

Use path-style addressing (required by most S3-compatible stores).

---

### credentials?

> `optional` **credentials?**: `object`

Defined in: [types/skills.ts:157](https://github.com/juspay/neurolink/blob/release/src/lib/types/skills.ts#L157)

#### accessKeyId

> **accessKeyId**: `string`

#### secretAccessKey

> **secretAccessKey**: `string`

#### sessionToken?

> `optional` **sessionToken?**: `string`
