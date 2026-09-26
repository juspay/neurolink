[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CacheEvents

# Type Alias: CacheEvents

> **CacheEvents** = `object`

Cache events

## Properties

### hit

> **hit**: `object`

#### key

> **key**: `string`

#### value

> **value**: `unknown`

---

### miss

> **miss**: `object`

#### key

> **key**: `string`

---

### set

> **set**: `object`

#### key

> **key**: `string`

#### value

> **value**: `unknown`

#### ttl

> **ttl**: `number`

---

### evict

> **evict**: `object`

#### key

> **key**: `string`

#### reason

> **reason**: `"expired"` \| `"capacity"` \| `"manual"`

---

### clear

> **clear**: `object`

#### entriesRemoved

> **entriesRemoved**: `number`
