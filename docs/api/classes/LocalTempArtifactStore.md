[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LocalTempArtifactStore

# Class: LocalTempArtifactStore

Filesystem-backed artifact store using the OS temp directory.

Files are written with mode 0o600 (owner read/write only).
An in-memory index tracks metadata for the fast path; every payload also
gets a `<id>.meta.json` sidecar, so an id this process never stored — from
another process, or from before a restart — still resolves (see
`rehydrate`). `cleanup()` remains index-scoped: it expires what this process
knows about, and never walks the directory deleting another process's work.

## Example

```typescript
const store = new LocalTempArtifactStore();
const ref = await store.store(largeJson, {
  toolName: "list_files",
  serverId: "filesystem-server",
  sizeBytes: Buffer.byteLength(largeJson),
  contentType: "json",
});
// Later, via retrieve_context:
const full = await store.retrieve(ref.id);
```

## Implements

- [`ArtifactStore`](../type-aliases/ArtifactStore.md)

## Constructors

### Constructor

> **new LocalTempArtifactStore**(`dir?`, `options?`): `LocalTempArtifactStore`

#### Parameters

##### dir?

`string`

Storage directory; defaults to `tmpdir()/neurolink-artifacts`

##### options?

`rehydrateFromDisk` (default true) lets `retrieve()` and
`delete()` fall back to the on-disk sidecar index on an in-memory miss,
which makes artifacts READABLE AND DELETABLE ACROSS PROCESSES sharing
the same directory and unix user. Pass `false` — or set
`NEUROLINK_ARTIFACT_REHYDRATE=false` — to restore strict per-process
isolation: ids not stored by this process resolve to nothing.

###### rehydrateFromDisk?

`boolean`

#### Returns

`LocalTempArtifactStore`

## Methods

### generatePreview()

> **generatePreview**(`payload`): `string`

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

### delete()

> **delete**(`id`): `Promise`\<`void`\>

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

Delete all artifacts older than `olderThanMs` milliseconds.
Returns the number of artifacts deleted.

#### Parameters

##### olderThanMs

`number`

#### Returns

`Promise`\<`number`\>

#### Implementation of

`ArtifactStore.cleanup`
