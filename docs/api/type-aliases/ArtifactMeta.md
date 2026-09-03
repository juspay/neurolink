[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ArtifactMeta

# Type Alias: ArtifactMeta

> **ArtifactMeta** = `object`

Defined in: [types/artifact.ts:18](https://github.com/juspay/neurolink/blob/release/src/lib/types/artifact.ts#L18)

Metadata recorded alongside a stored artifact.

## Properties

### toolName

> **toolName**: `string`

Defined in: [types/artifact.ts:20](https://github.com/juspay/neurolink/blob/release/src/lib/types/artifact.ts#L20)

Tool name that produced the output.

---

### serverId

> **serverId**: `string`

Defined in: [types/artifact.ts:22](https://github.com/juspay/neurolink/blob/release/src/lib/types/artifact.ts#L22)

MCP server ID.

---

### sessionId?

> `optional` **sessionId?**: `string`

Defined in: [types/artifact.ts:24](https://github.com/juspay/neurolink/blob/release/src/lib/types/artifact.ts#L24)

Session that triggered the tool call (optional).

---

### sizeBytes

> **sizeBytes**: `number`

Defined in: [types/artifact.ts:26](https://github.com/juspay/neurolink/blob/release/src/lib/types/artifact.ts#L26)

Serialized byte size of the full payload.

---

### contentType

> **contentType**: `"json"` \| `"text"`

Defined in: [types/artifact.ts:28](https://github.com/juspay/neurolink/blob/release/src/lib/types/artifact.ts#L28)

Whether the payload is valid JSON or plain text.

---

### createdAt

> **createdAt**: `number`

Defined in: [types/artifact.ts:30](https://github.com/juspay/neurolink/blob/release/src/lib/types/artifact.ts#L30)

Unix epoch ms when the artifact was created.

---

### label?

> `optional` **label?**: `string`

Defined in: [types/artifact.ts:35](https://github.com/juspay/neurolink/blob/release/src/lib/types/artifact.ts#L35)

Human label for a host-banked artifact (e.g. "delegate:auth-review").
Absent on artifacts written by the MCP output normalizer.

---

### kind?

> `optional` **kind?**: [`BankedArtifactKind`](BankedArtifactKind.md)

Defined in: [types/artifact.ts:37](https://github.com/juspay/neurolink/blob/release/src/lib/types/artifact.ts#L37)

What kind of output was banked. Absent for MCP surrogates.
