[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ArtifactMeta

# Type Alias: ArtifactMeta

> **ArtifactMeta** = `object`

Defined in: [types/artifact.ts:16](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/artifact.ts#L16)

Metadata recorded alongside a stored artifact.

## Properties

### toolName

> **toolName**: `string`

Defined in: [types/artifact.ts:18](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/artifact.ts#L18)

Tool name that produced the output.

---

### serverId

> **serverId**: `string`

Defined in: [types/artifact.ts:20](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/artifact.ts#L20)

MCP server ID.

---

### sessionId?

> `optional` **sessionId?**: `string`

Defined in: [types/artifact.ts:22](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/artifact.ts#L22)

Session that triggered the tool call (optional).

---

### sizeBytes

> **sizeBytes**: `number`

Defined in: [types/artifact.ts:24](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/artifact.ts#L24)

Serialized byte size of the full payload.

---

### contentType

> **contentType**: `"json"` \| `"text"`

Defined in: [types/artifact.ts:26](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/artifact.ts#L26)

Whether the payload is valid JSON or plain text.

---

### createdAt

> **createdAt**: `number`

Defined in: [types/artifact.ts:28](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/artifact.ts#L28)

Unix epoch ms when the artifact was created.
