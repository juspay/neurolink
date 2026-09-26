[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BankedArtifactRef

# Type Alias: BankedArtifactRef

> **BankedArtifactRef** = `object`

What the conversation gets instead of the payload: an id, a bounded head
slice, and the exact call that reads the rest. The FULL payload is always on
disk — a preview is a pointer, never a replacement.

## Properties

### artifactId

> **artifactId**: `string`

Id to pass to `retrieve_context({ artifactId })`.

---

### label

> **label**: `string`

---

### kind

> **kind**: [`BankedArtifactKind`](BankedArtifactKind.md)

---

### sizeBytes

> **sizeBytes**: `number`

UTF-8 byte size of the complete payload.

---

### preview

> **preview**: `string`

Bounded head slice of the payload (characters, not bytes).

---

### readBackHint

> **readBackHint**: `string`

Literal read-back call, so the model never has to guess the tool.
