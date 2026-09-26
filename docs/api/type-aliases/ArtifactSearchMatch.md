[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ArtifactSearchMatch

# Type Alias: ArtifactSearchMatch

> **ArtifactSearchMatch** = `object`

One hit from a literal search over an artifact.

## Properties

### offset

> **offset**: `number`

Character offset of the match — pass it back as `offset` to read there.

---

### line

> **line**: `number`

1-based line number the match sits on.

---

### snippetOffset

> **snippetOffset**: `number`

Character offset the snippet starts at (≤ `offset`).

---

### snippet

> **snippet**: `string`

Bounded context around the match. Bounded on purpose: an MCP artifact is
usually one compact JSON line, so "the matching line" would be the whole
payload.
