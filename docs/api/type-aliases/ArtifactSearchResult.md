[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ArtifactSearchResult

# Type Alias: ArtifactSearchResult

> **ArtifactSearchResult** = `object`

Result of a literal search over an artifact.

## Properties

### matches

> **matches**: [`ArtifactSearchMatch`](ArtifactSearchMatch.md)[]

Matches returned, in payload order.

---

### matchCount

> **matchCount**: `number`

`matches.length`.

---

### totalMatches

> **totalMatches**: `number`

Every match in the payload, including the ones not returned.

---

### truncated

> **truncated**: `boolean`

True when `totalMatches > matchCount`.

---

### nextSearchOffset?

> `optional` **nextSearchOffset?**: `number`

Character offset to pass as `offset` to search for the next matches.
