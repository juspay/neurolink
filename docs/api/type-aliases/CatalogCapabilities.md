[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CatalogCapabilities

# Type Alias: CatalogCapabilities

> **CatalogCapabilities** = `object`

Defined in: [types/providerCatalog.ts:126](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L126)

## Properties

### text

> **text**: `boolean`

Defined in: [types/providerCatalog.ts:127](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L127)

---

### streaming

> **streaming**: `boolean`

Defined in: [types/providerCatalog.ts:128](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L128)

---

### tools

> **tools**: `boolean` \| `"model-dependent"`

Defined in: [types/providerCatalog.ts:136](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L136)

"model-dependent" when tool support varies per served model and the
vendor doesn't reject `tools` for unsupported ones (the model just
never emits tool_calls) — e.g. HuggingFace's router. Maps to
ProviderDescriptor.toolSupport's own "model-dependent" member and
leaves OpenAICompatCatalogEntry.supportsTools unset so
ConfiguredOpenAICompatProvider falls through to the model-registry
default, exactly like an entry that never set supportsTools at all.

---

### toolsWithStreaming

> **toolsWithStreaming**: `boolean`

Defined in: [types/providerCatalog.ts:137](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L137)

---

### structuredOutput

> **structuredOutput**: `boolean`

Defined in: [types/providerCatalog.ts:138](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L138)

---

### structuredOutputWithTools

> **structuredOutputWithTools**: `boolean`

Defined in: [types/providerCatalog.ts:139](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L139)

---

### embeddings

> **embeddings**: `boolean`

Defined in: [types/providerCatalog.ts:140](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L140)

---

### thinking

> **thinking**: `boolean`

Defined in: [types/providerCatalog.ts:141](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L141)
