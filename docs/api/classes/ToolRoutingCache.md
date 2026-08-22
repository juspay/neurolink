[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolRoutingCache

# Class: ToolRoutingCache

Defined in: [core/toolRoutingCache.ts:34](https://github.com/juspay/neurolink/blob/release/src/lib/core/toolRoutingCache.ts#L34)

## Constructors

### Constructor

> **new ToolRoutingCache**(`opts?`): `ToolRoutingCache`

Defined in: [core/toolRoutingCache.ts:47](https://github.com/juspay/neurolink/blob/release/src/lib/core/toolRoutingCache.ts#L47)

#### Parameters

##### opts?

[`ToolRoutingCacheOptions`](../type-aliases/ToolRoutingCacheOptions.md) = `{}`

#### Returns

`ToolRoutingCache`

## Methods

### get()

> **get**(`key`): \{ `excludedToolNames`: `string`[]; `selectedServerIds`: `string`[]; \} \| `undefined`

Defined in: [core/toolRoutingCache.ts:62](https://github.com/juspay/neurolink/blob/release/src/lib/core/toolRoutingCache.ts#L62)

Returns the cached routing result for the given key, or `undefined` on a
miss or expiry. Expired entries are deleted on access (lazy eviction).

#### Parameters

##### key

`string`

#### Returns

\{ `excludedToolNames`: `string`[]; `selectedServerIds`: `string`[]; \} \| `undefined`

---

### set()

> **set**(`key`, `value`): `void`

Defined in: [core/toolRoutingCache.ts:89](https://github.com/juspay/neurolink/blob/release/src/lib/core/toolRoutingCache.ts#L89)

Stores a routing result under the given key. Evicts the least-recently-
used entry when the store is at capacity. Silently no-ops on any error
(caller is responsible for fail-open behaviour).

#### Parameters

##### key

`string`

##### value

###### excludedToolNames

`string`[]

###### selectedServerIds

`string`[]

#### Returns

`void`

---

### recordSelection()

> **recordSelection**(`sessionId`, `serverIds`): `void`

Defined in: [core/toolRoutingCache.ts:114](https://github.com/juspay/neurolink/blob/release/src/lib/core/toolRoutingCache.ts#L114)

Records the server ids selected by the router for a session so they stay
warm for the next `stickyTurns` turns. Called after a successful
(non-cached) routing resolution.

#### Parameters

##### sessionId

`string`

##### serverIds

`string`[]

#### Returns

`void`

---

### getStickyServerIds()

> **getStickyServerIds**(`sessionId`): `string`[]

Defined in: [core/toolRoutingCache.ts:138](https://github.com/juspay/neurolink/blob/release/src/lib/core/toolRoutingCache.ts#L138)

Returns the server ids that should be kept warm (not excluded) for the
given session due to stickiness. Decrements the turn counter; when it
reaches zero the entry is removed. Returns an empty array when there is no
active sticky state for the session.

#### Parameters

##### sessionId

`string`

#### Returns

`string`[]
