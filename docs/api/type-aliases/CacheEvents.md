[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CacheEvents

# Type Alias: CacheEvents

> **CacheEvents** = `object`

Defined in: [types/mcp.ts:2416](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2416)

Cache events

## Properties

### hit

> **hit**: `object`

Defined in: [types/mcp.ts:2417](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2417)

#### key

> **key**: `string`

#### value

> **value**: `unknown`

---

### miss

> **miss**: `object`

Defined in: [types/mcp.ts:2418](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2418)

#### key

> **key**: `string`

---

### set

> **set**: `object`

Defined in: [types/mcp.ts:2419](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2419)

#### key

> **key**: `string`

#### value

> **value**: `unknown`

#### ttl

> **ttl**: `number`

---

### evict

> **evict**: `object`

Defined in: [types/mcp.ts:2420](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2420)

#### key

> **key**: `string`

#### reason

> **reason**: `"expired"` \| `"capacity"` \| `"manual"`

---

### clear

> **clear**: `object`

Defined in: [types/mcp.ts:2421](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2421)

#### entriesRemoved

> **entriesRemoved**: `number`
