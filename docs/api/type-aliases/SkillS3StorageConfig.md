[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SkillS3StorageConfig

# Type Alias: SkillS3StorageConfig

> **SkillS3StorageConfig** = `object`

S3-backed store. Layout: `<prefix>skills/<id>.json` per skill plus a
`<prefix>index.json` document that is upserted on writes and rebuilt
from a bucket listing when missing or corrupt (self-healing).

Requires the optional peer `@aws-sdk/client-s3` to be installed in the
host application (same pattern as memory's optional @juspay/hippocampus).
Credentials default to the standard AWS provider chain when omitted.

## Properties

### type

> **type**: `"s3"`

---

### bucket

> **bucket**: `string`

---

### prefix?

> `optional` **prefix?**: `string`

Key prefix inside the bucket. Default: "neurolink-skills/".

---

### region?

> `optional` **region?**: `string`

---

### endpoint?

> `optional` **endpoint?**: `string`

Custom endpoint (MinIO, LocalStack, …).

---

### forcePathStyle?

> `optional` **forcePathStyle?**: `boolean`

Use path-style addressing (required by most S3-compatible stores).

---

### credentials?

> `optional` **credentials?**: `object`

#### accessKeyId

> **accessKeyId**: `string`

#### secretAccessKey

> **secretAccessKey**: `string`

#### sessionToken?

> `optional` **sessionToken?**: `string`
