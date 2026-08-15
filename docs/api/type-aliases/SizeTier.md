[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / SizeTier

# Type Alias: SizeTier

> **SizeTier** = `"tiny"` \| `"small"` \| `"medium"` \| `"large"` \| `"huge"` \| `"oversized"`

Defined in: [types/fileReference.ts:21](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/fileReference.ts#L21)

Size tier determines the processing strategy for a file.

- tiny: Inline in prompt (current behavior)
- small: Full load, truncate to budget
- medium: Outline + on-demand sections
- large: Stream + chunked summarization
- huge: Reference only + tool-based access
- oversized: Reject with informative message
