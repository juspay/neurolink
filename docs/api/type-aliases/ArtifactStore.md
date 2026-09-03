[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ArtifactStore

# Type Alias: ArtifactStore

> **ArtifactStore** = `object`

Defined in: [types/artifact.ts:172](https://github.com/juspay/neurolink/blob/release/src/lib/types/artifact.ts#L172)

Pluggable storage contract for externalized MCP tool outputs and banked
payloads.

Shipped backends: `LocalTempArtifactStore` (filesystem, per-process index
with a cross-process sidecar) and `RedisArtifactStore` (TTL-expired, shared
across replicas, range reads). Pick one with `artifacts.storage` or the
`STORAGE_TYPE` environment variable, or inject any implementation via
`artifacts.store` / `setArtifactStore()`.

Only `store`, `retrieve`, `delete`, `cleanup` and `generatePreview` are
required. `retrieveRange` and `close` are optional capabilities: NeuroLink
uses them when present and falls back cleanly when absent.

## Methods

### store()

> **store**(`payload`, `meta`): `Promise`\<[`ArtifactRef`](ArtifactRef.md)\>

Defined in: [types/artifact.ts:178](https://github.com/juspay/neurolink/blob/release/src/lib/types/artifact.ts#L178)

Persist a payload and return a lightweight reference.

#### Parameters

##### payload

`string`

Serialized tool output (JSON string or plain text).

##### meta

`Omit`\<[`ArtifactMeta`](ArtifactMeta.md), `"createdAt"`\>

Descriptor without `createdAt` (assigned internally).

#### Returns

`Promise`\<[`ArtifactRef`](ArtifactRef.md)\>

---

### retrieve()

> **retrieve**(`id`): `Promise`\<`string` \| `null`\>

Defined in: [types/artifact.ts:187](https://github.com/juspay/neurolink/blob/release/src/lib/types/artifact.ts#L187)

Retrieve the full payload by artifact ID.
Returns `null` if the artifact is not found or has been cleaned up.

#### Parameters

##### id

`string`

#### Returns

`Promise`\<`string` \| `null`\>

---

### retrieveRange()?

> `optional` **retrieveRange**(`id`, `range`): `Promise`\<[`ArtifactWindow`](ArtifactWindow.md) \| `null`\>

Defined in: [types/artifact.ts:204](https://github.com/juspay/neurolink/blob/release/src/lib/types/artifact.ts#L204)

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

[`ArtifactPageRequest`](ArtifactPageRequest.md)

#### Returns

`Promise`\<[`ArtifactWindow`](ArtifactWindow.md) \| `null`\>

---

### delete()

> **delete**(`id`): `Promise`\<`void`\>

Defined in: [types/artifact.ts:210](https://github.com/juspay/neurolink/blob/release/src/lib/types/artifact.ts#L210)

Delete a single artifact. No-op if the ID does not exist.

#### Parameters

##### id

`string`

#### Returns

`Promise`\<`void`\>

---

### cleanup()

> **cleanup**(`olderThanMs`): `Promise`\<`number`\>

Defined in: [types/artifact.ts:216](https://github.com/juspay/neurolink/blob/release/src/lib/types/artifact.ts#L216)

Delete all artifacts older than `olderThanMs` milliseconds.
Returns the number of artifacts deleted.

#### Parameters

##### olderThanMs

`number`

#### Returns

`Promise`\<`number`\>

---

### generatePreview()

> **generatePreview**(`payload`): `string`

Defined in: [types/artifact.ts:219](https://github.com/juspay/neurolink/blob/release/src/lib/types/artifact.ts#L219)

Generate a short preview string from a serialized payload.

#### Parameters

##### payload

`string`

#### Returns

`string`

---

### close()?

> `optional` **close**(): `Promise`\<`void`\>

Defined in: [types/artifact.ts:227](https://github.com/juspay/neurolink/blob/release/src/lib/types/artifact.ts#L227)

Release whatever the store holds open (a pooled connection, a file
handle). Optional. NeuroLink calls it — from `shutdown()`, and when
`setArtifactStore()` replaces the store — only for stores it built
itself; a store you inject is yours to close.

#### Returns

`Promise`\<`void`\>
