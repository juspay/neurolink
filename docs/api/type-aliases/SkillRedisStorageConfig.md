[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SkillRedisStorageConfig

# Type Alias: SkillRedisStorageConfig

> **SkillRedisStorageConfig** = `object`

Defined in: [types/skills.ts:170](https://github.com/juspay/neurolink/blob/release/src/lib/types/skills.ts#L170)

Redis-backed store using NeuroLink's pooled Redis client (`redis` v5,
already a core dependency). One JSON value per skill under
`<keyPrefix><id>`; the index is derived via SCAN + MGET. Skills are
persistent — no TTL is applied.

## Properties

### type

> **type**: `"redis"`

Defined in: [types/skills.ts:171](https://github.com/juspay/neurolink/blob/release/src/lib/types/skills.ts#L171)

---

### url?

> `optional` **url?**: `string`

Defined in: [types/skills.ts:172](https://github.com/juspay/neurolink/blob/release/src/lib/types/skills.ts#L172)

---

### host?

> `optional` **host?**: `string`

Defined in: [types/skills.ts:173](https://github.com/juspay/neurolink/blob/release/src/lib/types/skills.ts#L173)

---

### port?

> `optional` **port?**: `number`

Defined in: [types/skills.ts:174](https://github.com/juspay/neurolink/blob/release/src/lib/types/skills.ts#L174)

---

### username?

> `optional` **username?**: `string`

Defined in: [types/skills.ts:175](https://github.com/juspay/neurolink/blob/release/src/lib/types/skills.ts#L175)

---

### password?

> `optional` **password?**: `string`

Defined in: [types/skills.ts:176](https://github.com/juspay/neurolink/blob/release/src/lib/types/skills.ts#L176)

---

### db?

> `optional` **db?**: `number`

Defined in: [types/skills.ts:177](https://github.com/juspay/neurolink/blob/release/src/lib/types/skills.ts#L177)

---

### keyPrefix?

> `optional` **keyPrefix?**: `string`

Defined in: [types/skills.ts:179](https://github.com/juspay/neurolink/blob/release/src/lib/types/skills.ts#L179)

Key prefix. Default: "neurolink:skills:".
