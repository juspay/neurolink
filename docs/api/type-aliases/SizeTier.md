[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / SizeTier

# Type Alias: SizeTier

> **SizeTier** = `"tiny"` \| `"small"` \| `"medium"` \| `"large"` \| `"huge"` \| `"oversized"`

Defined in: [types/fileReference.ts:21](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/fileReference.ts#L21)

Size tier determines the processing strategy for a file.

- tiny: Inline in prompt (current behavior)
- small: Full load, truncate to budget
- medium: Outline + on-demand sections
- large: Stream + chunked summarization
- huge: Reference only + tool-based access
- oversized: Reject with informative message
