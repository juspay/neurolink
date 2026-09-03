[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ArtifactSearchResult

# Type Alias: ArtifactSearchResult

> **ArtifactSearchResult** = `object`

Defined in: [types/artifact.ts:141](https://github.com/juspay/neurolink/blob/release/src/lib/types/artifact.ts#L141)

Result of a literal search over an artifact.

## Properties

### matches

> **matches**: [`ArtifactSearchMatch`](ArtifactSearchMatch.md)[]

Defined in: [types/artifact.ts:143](https://github.com/juspay/neurolink/blob/release/src/lib/types/artifact.ts#L143)

Matches returned, in payload order.

---

### matchCount

> **matchCount**: `number`

Defined in: [types/artifact.ts:145](https://github.com/juspay/neurolink/blob/release/src/lib/types/artifact.ts#L145)

`matches.length`.

---

### totalMatches

> **totalMatches**: `number`

Defined in: [types/artifact.ts:147](https://github.com/juspay/neurolink/blob/release/src/lib/types/artifact.ts#L147)

Every match in the payload, including the ones not returned.

---

### truncated

> **truncated**: `boolean`

Defined in: [types/artifact.ts:149](https://github.com/juspay/neurolink/blob/release/src/lib/types/artifact.ts#L149)

True when `totalMatches > matchCount`.

---

### nextSearchOffset?

> `optional` **nextSearchOffset?**: `number`

Defined in: [types/artifact.ts:151](https://github.com/juspay/neurolink/blob/release/src/lib/types/artifact.ts#L151)

Character offset to pass as `offset` to search for the next matches.
