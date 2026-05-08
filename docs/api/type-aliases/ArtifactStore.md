[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ArtifactStore

# Type Alias: ArtifactStore

> **ArtifactStore** = `object`

Defined in: [types/artifact.ts:53](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/artifact.ts#L53)

Pluggable storage contract for externalized MCP tool outputs.

Default backend: LocalTempArtifactStore (filesystem, single-process).
Future backends can implement this interface for S3, Redis blobs, etc.

## Methods

### store()

> **store**(`payload`, `meta`): `Promise`\<[`ArtifactRef`](ArtifactRef.md)\>

Defined in: [types/artifact.ts:59](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/artifact.ts#L59)

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

Defined in: [types/artifact.ts:68](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/artifact.ts#L68)

Retrieve the full payload by artifact ID.
Returns `null` if the artifact is not found or has been cleaned up.

#### Parameters

##### id

`string`

#### Returns

`Promise`\<`string` \| `null`\>

---

### delete()

> **delete**(`id`): `Promise`\<`void`\>

Defined in: [types/artifact.ts:71](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/artifact.ts#L71)

Delete a single artifact. No-op if the ID does not exist.

#### Parameters

##### id

`string`

#### Returns

`Promise`\<`void`\>

---

### cleanup()

> **cleanup**(`olderThanMs`): `Promise`\<`number`\>

Defined in: [types/artifact.ts:77](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/artifact.ts#L77)

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

Defined in: [types/artifact.ts:80](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/artifact.ts#L80)

Generate a short preview string from a serialized payload.

#### Parameters

##### payload

`string`

#### Returns

`string`
