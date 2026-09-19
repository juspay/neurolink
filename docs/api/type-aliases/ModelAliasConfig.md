[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelAliasConfig

# Type Alias: ModelAliasConfig

> **ModelAliasConfig** = `object`

Defined in: [types/generate.ts:1824](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1824)

NL-004: Model alias/deprecation configuration.
Allows mapping deprecated model names to their replacements.

## Properties

### aliases

> **aliases**: `Record`\<`string`, \{ `target`: `string`; `action`: `"warn"` \| `"redirect"` \| `"block"`; `reason?`: `string`; \}\>

Defined in: [types/generate.ts:1825](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1825)
