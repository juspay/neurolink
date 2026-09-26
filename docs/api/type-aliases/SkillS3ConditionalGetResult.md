[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SkillS3ConditionalGetResult

# Type Alias: SkillS3ConditionalGetResult

> **SkillS3ConditionalGetResult** = `object`

Result of a conditional (ETag) object read.

## Properties

### body

> **body**: `string` \| `null`

Object body; null when the key is absent.

---

### etag?

> `optional` **etag?**: `string`

ETag of the returned body, for the next conditional read.

---

### notModified?

> `optional` **notModified?**: `boolean`

True when the object is unchanged since the supplied ETag (no body).
