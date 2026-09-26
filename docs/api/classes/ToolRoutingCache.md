[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolRoutingCache

# Class: ToolRoutingCache

## Constructors

### Constructor

> **new ToolRoutingCache**(`opts?`): `ToolRoutingCache`

#### Parameters

##### opts?

[`ToolRoutingCacheOptions`](../type-aliases/ToolRoutingCacheOptions.md) = `{}`

#### Returns

`ToolRoutingCache`

## Methods

### get()

> **get**(`key`): \{ `excludedToolNames`: `string`[]; `selectedServerIds`: `string`[]; \} \| `undefined`

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

Returns the server ids that should be kept warm (not excluded) for the
given session due to stickiness. Decrements the turn counter; when it
reaches zero the entry is removed. Returns an empty array when there is no
active sticky state for the session.

#### Parameters

##### sessionId

`string`

#### Returns

`string`[]
