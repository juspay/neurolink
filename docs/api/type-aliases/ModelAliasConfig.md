[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelAliasConfig

# Type Alias: ModelAliasConfig

> **ModelAliasConfig** = `object`

Defined in: [types/generate.ts:1691](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/generate.ts#L1691)

NL-004: Model alias/deprecation configuration.
Allows mapping deprecated model names to their replacements.

## Properties

### aliases

> **aliases**: `Record`\<`string`, \{ `target`: `string`; `action`: `"warn"` \| `"redirect"` \| `"block"`; `reason?`: `string`; \}\>

Defined in: [types/generate.ts:1692](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/generate.ts#L1692)
