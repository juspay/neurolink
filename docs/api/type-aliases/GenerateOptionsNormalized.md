[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / GenerateOptionsNormalized

# Type Alias: GenerateOptionsNormalized

> **GenerateOptionsNormalized** = [`GenerateOptions`](GenerateOptions.md) & `object`

Internal alias used by messageBuilder helpers after the entry-point
(`buildMultimodalMessagesArray`) has guaranteed that `input` is non-null.
All private helper functions that receive post-normalised options should
accept this type to avoid repetitive null checks on every `input.*` access.

## Type Declaration

### input

> **input**: `NonNullable`\<[`GenerateOptions`](GenerateOptions.md)\[`"input"`\]\>
