[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ArchiveDecompressionResult

# Type Alias: ArchiveDecompressionResult

> **ArchiveDecompressionResult** = \{ `status`: `"ok"`; `buffer`: `Buffer`; \} \| \{ `status`: `"tool-unavailable"`; \} \| \{ `status`: `"too-large"`; \} \| \{ `status`: `"failed"`; \}

Defined in: [types/processor.ts:901](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/processor.ts#L901)

Outcome of decompressing a single-stream archive (.bz2, .xz, .zst).

A plain `Buffer | null` collapsed two very different failures into one: a
machine that has no `xz` installed and a `.xz` file that is corrupt both
returned null, and the caller reported both as "the command is unavailable on
this machine" — actively misleading for the second. The reason is carried so
the message can match the fact.
