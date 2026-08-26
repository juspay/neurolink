[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BankedArtifactRef

# Type Alias: BankedArtifactRef

> **BankedArtifactRef** = `object`

Defined in: [types/artifact.ts:83](https://github.com/juspay/neurolink/blob/release/src/lib/types/artifact.ts#L83)

What the conversation gets instead of the payload: an id, a bounded head
slice, and the exact call that reads the rest. The FULL payload is always on
disk — a preview is a pointer, never a replacement.

## Properties

### artifactId

> **artifactId**: `string`

Defined in: [types/artifact.ts:85](https://github.com/juspay/neurolink/blob/release/src/lib/types/artifact.ts#L85)

Id to pass to `retrieve_context({ artifactId })`.

---

### label

> **label**: `string`

Defined in: [types/artifact.ts:86](https://github.com/juspay/neurolink/blob/release/src/lib/types/artifact.ts#L86)

---

### kind

> **kind**: [`BankedArtifactKind`](BankedArtifactKind.md)

Defined in: [types/artifact.ts:87](https://github.com/juspay/neurolink/blob/release/src/lib/types/artifact.ts#L87)

---

### sizeBytes

> **sizeBytes**: `number`

Defined in: [types/artifact.ts:89](https://github.com/juspay/neurolink/blob/release/src/lib/types/artifact.ts#L89)

UTF-8 byte size of the complete payload.

---

### preview

> **preview**: `string`

Defined in: [types/artifact.ts:91](https://github.com/juspay/neurolink/blob/release/src/lib/types/artifact.ts#L91)

Bounded head slice of the payload (characters, not bytes).

---

### readBackHint

> **readBackHint**: `string`

Defined in: [types/artifact.ts:93](https://github.com/juspay/neurolink/blob/release/src/lib/types/artifact.ts#L93)

Literal read-back call, so the model never has to guess the tool.
