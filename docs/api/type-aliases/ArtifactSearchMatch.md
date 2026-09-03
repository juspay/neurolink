[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ArtifactSearchMatch

# Type Alias: ArtifactSearchMatch

> **ArtifactSearchMatch** = `object`

Defined in: [types/artifact.ts:125](https://github.com/juspay/neurolink/blob/release/src/lib/types/artifact.ts#L125)

One hit from a literal search over an artifact.

## Properties

### offset

> **offset**: `number`

Defined in: [types/artifact.ts:127](https://github.com/juspay/neurolink/blob/release/src/lib/types/artifact.ts#L127)

Character offset of the match — pass it back as `offset` to read there.

---

### line

> **line**: `number`

Defined in: [types/artifact.ts:129](https://github.com/juspay/neurolink/blob/release/src/lib/types/artifact.ts#L129)

1-based line number the match sits on.

---

### snippetOffset

> **snippetOffset**: `number`

Defined in: [types/artifact.ts:131](https://github.com/juspay/neurolink/blob/release/src/lib/types/artifact.ts#L131)

Character offset the snippet starts at (≤ `offset`).

---

### snippet

> **snippet**: `string`

Defined in: [types/artifact.ts:137](https://github.com/juspay/neurolink/blob/release/src/lib/types/artifact.ts#L137)

Bounded context around the match. Bounded on purpose: an MCP artifact is
usually one compact JSON line, so "the matching line" would be the whole
payload.
