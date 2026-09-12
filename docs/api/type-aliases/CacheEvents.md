[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CacheEvents

# Type Alias: CacheEvents

> **CacheEvents** = `object`

Defined in: [types/mcp.ts:2435](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2435)

Cache events

## Properties

### hit

> **hit**: `object`

Defined in: [types/mcp.ts:2436](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2436)

#### key

> **key**: `string`

#### value

> **value**: `unknown`

---

### miss

> **miss**: `object`

Defined in: [types/mcp.ts:2437](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2437)

#### key

> **key**: `string`

---

### set

> **set**: `object`

Defined in: [types/mcp.ts:2438](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2438)

#### key

> **key**: `string`

#### value

> **value**: `unknown`

#### ttl

> **ttl**: `number`

---

### evict

> **evict**: `object`

Defined in: [types/mcp.ts:2439](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2439)

#### key

> **key**: `string`

#### reason

> **reason**: `"expired"` \| `"capacity"` \| `"manual"`

---

### clear

> **clear**: `object`

Defined in: [types/mcp.ts:2440](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2440)

#### entriesRemoved

> **entriesRemoved**: `number`
