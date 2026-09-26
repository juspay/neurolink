[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ArtifactMeta

# Type Alias: ArtifactMeta

> **ArtifactMeta** = `object`

Metadata recorded alongside a stored artifact.

## Properties

### toolName

> **toolName**: `string`

Tool name that produced the output.

---

### serverId

> **serverId**: `string`

MCP server ID.

---

### sessionId?

> `optional` **sessionId?**: `string`

Session that triggered the tool call (optional).

---

### sizeBytes

> **sizeBytes**: `number`

Serialized byte size of the full payload.

---

### contentType

> **contentType**: `"json"` \| `"text"`

Whether the payload is valid JSON or plain text.

---

### createdAt

> **createdAt**: `number`

Unix epoch ms when the artifact was created.

---

### label?

> `optional` **label?**: `string`

Human label for a host-banked artifact (e.g. "delegate:auth-review").
Absent on artifacts written by the MCP output normalizer.

---

### kind?

> `optional` **kind?**: [`BankedArtifactKind`](BankedArtifactKind.md)

What kind of output was banked. Absent for MCP surrogates.
