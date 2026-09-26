[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SkillRedisStorageConfig

# Type Alias: SkillRedisStorageConfig

> **SkillRedisStorageConfig** = `object`

Redis-backed store using NeuroLink's pooled Redis client (`redis` v5,
already a core dependency). One JSON value per skill under
`<keyPrefix><id>`; the index is derived via SCAN + MGET. Skills are
persistent — no TTL is applied.

## Properties

### type

> **type**: `"redis"`

---

### url?

> `optional` **url?**: `string`

---

### host?

> `optional` **host?**: `string`

---

### port?

> `optional` **port?**: `number`

---

### username?

> `optional` **username?**: `string`

---

### password?

> `optional` **password?**: `string`

---

### db?

> `optional` **db?**: `number`

---

### keyPrefix?

> `optional` **keyPrefix?**: `string`

Key prefix. Default: "neurolink:skills:".
