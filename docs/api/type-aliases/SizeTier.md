[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / SizeTier

# Type Alias: SizeTier

> **SizeTier** = `"tiny"` \| `"small"` \| `"medium"` \| `"large"` \| `"huge"` \| `"oversized"`

Defined in: [types/fileReference.ts:21](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L21)

Size tier determines the processing strategy for a file.

- tiny: Inline in prompt (current behavior)
- small: Full load, truncate to budget
- medium: Outline + on-demand sections
- large: Stream + chunked summarization
- huge: Reference only + tool-based access
- oversized: Reject with informative message
