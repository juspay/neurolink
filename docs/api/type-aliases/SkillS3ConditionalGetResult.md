[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SkillS3ConditionalGetResult

# Type Alias: SkillS3ConditionalGetResult

> **SkillS3ConditionalGetResult** = `object`

Defined in: [types/skills.ts:204](https://github.com/juspay/neurolink/blob/release/src/lib/types/skills.ts#L204)

Result of a conditional (ETag) object read.

## Properties

### body

> **body**: `string` \| `null`

Defined in: [types/skills.ts:206](https://github.com/juspay/neurolink/blob/release/src/lib/types/skills.ts#L206)

Object body; null when the key is absent.

---

### etag?

> `optional` **etag?**: `string`

Defined in: [types/skills.ts:208](https://github.com/juspay/neurolink/blob/release/src/lib/types/skills.ts#L208)

ETag of the returned body, for the next conditional read.

---

### notModified?

> `optional` **notModified?**: `boolean`

Defined in: [types/skills.ts:210](https://github.com/juspay/neurolink/blob/release/src/lib/types/skills.ts#L210)

True when the object is unchanged since the supplied ETag (no body).
