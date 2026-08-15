[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / GenerateOptionsNormalized

# Type Alias: GenerateOptionsNormalized

> **GenerateOptionsNormalized** = [`GenerateOptions`](GenerateOptions.md) & `object`

Defined in: [types/generate.ts:1708](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/generate.ts#L1708)

Internal alias used by messageBuilder helpers after the entry-point
(`buildMultimodalMessagesArray`) has guaranteed that `input` is non-null.
All private helper functions that receive post-normalised options should
accept this type to avoid repetitive null checks on every `input.*` access.

## Type Declaration

### input

> **input**: `NonNullable`\<[`GenerateOptions`](GenerateOptions.md)\[`"input"`\]\>
