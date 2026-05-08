[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / CacheEvents

# Type Alias: CacheEvents

> **CacheEvents** = `object`

Defined in: [types/mcp.ts:2397](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L2397)

Cache events

## Properties

### hit

> **hit**: `object`

Defined in: [types/mcp.ts:2398](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L2398)

#### key

> **key**: `string`

#### value

> **value**: `unknown`

---

### miss

> **miss**: `object`

Defined in: [types/mcp.ts:2399](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L2399)

#### key

> **key**: `string`

---

### set

> **set**: `object`

Defined in: [types/mcp.ts:2400](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L2400)

#### key

> **key**: `string`

#### value

> **value**: `unknown`

#### ttl

> **ttl**: `number`

---

### evict

> **evict**: `object`

Defined in: [types/mcp.ts:2401](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L2401)

#### key

> **key**: `string`

#### reason

> **reason**: `"expired"` \| `"capacity"` \| `"manual"`

---

### clear

> **clear**: `object`

Defined in: [types/mcp.ts:2402](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L2402)

#### entriesRemoved

> **entriesRemoved**: `number`
