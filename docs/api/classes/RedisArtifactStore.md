[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RedisArtifactStore

# Class: RedisArtifactStore

Defined in: [artifacts/redisArtifactStore.ts:145](https://github.com/juspay/neurolink/blob/release/src/lib/artifacts/redisArtifactStore.ts#L145)

Redis-backed artifact store: shared across replicas, expired by TTL,
range reads for ASCII payloads.

## Example

```typescript
const store = new RedisArtifactStore({ url: process.env.REDIS_URL });
const neurolink = new NeuroLink({ artifacts: { store } });
// or let NeuroLink build it: { artifacts: { storage: "redis" } }
```

## Implements

- [`ArtifactStore`](../type-aliases/ArtifactStore.md)

## Constructors

### Constructor

> **new RedisArtifactStore**(`config?`): `RedisArtifactStore`

Defined in: [artifacts/redisArtifactStore.ts:158](https://github.com/juspay/neurolink/blob/release/src/lib/artifacts/redisArtifactStore.ts#L158)

#### Parameters

##### config?

[`RedisStorageConfig`](../type-aliases/RedisStorageConfig.md) = `{}`

Connection and key settings. `keyPrefix` defaults to
`neurolink:artifact:`. `ttl` is seconds and must be positive; it
defaults to 86400 (24 hours), and zero, negative or non-finite values
are replaced by that default with a warning — artifacts in Redis always
expire, there is no "keep forever". `userSessionsKeyPrefix` is
meaningless here and ignored.

#### Returns

`RedisArtifactStore`

## Methods

### generatePreview()

> **generatePreview**(`payload`): `string`

Defined in: [artifacts/redisArtifactStore.ts:172](https://github.com/juspay/neurolink/blob/release/src/lib/artifacts/redisArtifactStore.ts#L172)

Generate a short preview string from a serialized payload.

#### Parameters

##### payload

`string`

#### Returns

`string`

#### Implementation of

`ArtifactStore.generatePreview`

---

### store()

> **store**(`payload`, `meta`): `Promise`\<[`ArtifactRef`](../type-aliases/ArtifactRef.md)\>

Defined in: [artifacts/redisArtifactStore.ts:176](https://github.com/juspay/neurolink/blob/release/src/lib/artifacts/redisArtifactStore.ts#L176)

Persist a payload and return a lightweight reference.

#### Parameters

##### payload

`string`

Serialized tool output (JSON string or plain text).

##### meta

`Omit`\<[`ArtifactMeta`](../type-aliases/ArtifactMeta.md), `"createdAt"`\>

Descriptor without `createdAt` (assigned internally).

#### Returns

`Promise`\<[`ArtifactRef`](../type-aliases/ArtifactRef.md)\>

#### Implementation of

`ArtifactStore.store`

---

### retrieve()

> **retrieve**(`id`): `Promise`\<`string` \| `null`\>

Defined in: [artifacts/redisArtifactStore.ts:214](https://github.com/juspay/neurolink/blob/release/src/lib/artifacts/redisArtifactStore.ts#L214)

Retrieve the full payload by artifact ID.
Returns `null` if the artifact is not found or has been cleaned up.

#### Parameters

##### id

`string`

#### Returns

`Promise`\<`string` \| `null`\>

#### Implementation of

`ArtifactStore.retrieve`

---

### retrieveRange()

> **retrieveRange**(`id`, `range`): `Promise`\<[`ArtifactWindow`](../type-aliases/ArtifactWindow.md) \| `null`\>

Defined in: [artifacts/redisArtifactStore.ts:223](https://github.com/juspay/neurolink/blob/release/src/lib/artifacts/redisArtifactStore.ts#L223)

Retrieve one character window without materialising the whole payload.

Optional. When present, `retrieve_context` and `readArtifact` call it for
every paged read instead of `retrieve()` + slice, so a backend with native
range reads (Redis `GETRANGE`, S3 `Range`) moves only the window. The
result carries `totalLength` so `hasMore` never needs the payload.

`offset` and `limit` are characters. A backend that can only address
bytes must either know the payload is single-byte (ASCII) or fall back to
a full read and slice — it must never return a window that starts at the
wrong character. `limit` omitted means "to the end".

Returns `null` if the artifact is not found or has expired.

#### Parameters

##### id

`string`

##### range

[`ArtifactPageRequest`](../type-aliases/ArtifactPageRequest.md)

#### Returns

`Promise`\<[`ArtifactWindow`](../type-aliases/ArtifactWindow.md) \| `null`\>

#### Implementation of

`ArtifactStore.retrieveRange`

---

### delete()

> **delete**(`id`): `Promise`\<`void`\>

Defined in: [artifacts/redisArtifactStore.ts:264](https://github.com/juspay/neurolink/blob/release/src/lib/artifacts/redisArtifactStore.ts#L264)

Delete a single artifact. No-op if the ID does not exist.

#### Parameters

##### id

`string`

#### Returns

`Promise`\<`void`\>

#### Implementation of

`ArtifactStore.delete`

---

### cleanup()

> **cleanup**(`olderThanMs`): `Promise`\<`number`\>

Defined in: [artifacts/redisArtifactStore.ts:277](https://github.com/juspay/neurolink/blob/release/src/lib/artifacts/redisArtifactStore.ts#L277)

Nothing to sweep: Redis expires every artifact `ttl` seconds after it was
written, on every replica at once, which is what `cleanup()` on the local
store could never do.

#### Parameters

##### olderThanMs

`number`

#### Returns

`Promise`\<`number`\>

#### Implementation of

`ArtifactStore.cleanup`

---

### close()

> **close**(): `Promise`\<`void`\>

Defined in: [artifacts/redisArtifactStore.ts:292](https://github.com/juspay/neurolink/blob/release/src/lib/artifacts/redisArtifactStore.ts#L292)

Release this store's reference on the pooled connection.

Waits for a connect that is still in flight: otherwise the reference it
is about to acquire would be assigned after this returned, and nothing
would ever release it.

#### Returns

`Promise`\<`void`\>

#### Implementation of

`ArtifactStore.close`
