[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelAliasConfig

# Type Alias: ModelAliasConfig

> **ModelAliasConfig** = `object`

Defined in: [types/generate.ts:1698](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/generate.ts#L1698)

NL-004: Model alias/deprecation configuration.
Allows mapping deprecated model names to their replacements.

## Properties

### aliases

> **aliases**: `Record`\<`string`, \{ `target`: `string`; `action`: `"warn"` \| `"redirect"` \| `"block"`; `reason?`: `string`; \}\>

Defined in: [types/generate.ts:1699](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/generate.ts#L1699)
