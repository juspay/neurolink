[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / GenerateOptionsNormalized

# Type Alias: GenerateOptionsNormalized

> **GenerateOptionsNormalized** = [`GenerateOptions`](GenerateOptions.md) & `object`

Defined in: [types/generate.ts:1755](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1755)

Internal alias used by messageBuilder helpers after the entry-point
(`buildMultimodalMessagesArray`) has guaranteed that `input` is non-null.
All private helper functions that receive post-normalised options should
accept this type to avoid repetitive null checks on every `input.*` access.

## Type Declaration

### input

> **input**: `NonNullable`\<[`GenerateOptions`](GenerateOptions.md)\[`"input"`\]\>
