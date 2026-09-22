[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CatalogCapabilities

# Type Alias: CatalogCapabilities

> **CatalogCapabilities** = `object`

Defined in: [types/providerCatalog.ts:121](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L121)

## Properties

### text

> **text**: `boolean`

Defined in: [types/providerCatalog.ts:122](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L122)

---

### streaming

> **streaming**: `boolean`

Defined in: [types/providerCatalog.ts:123](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L123)

---

### tools

> **tools**: `boolean` \| `"model-dependent"`

Defined in: [types/providerCatalog.ts:131](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L131)

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

Defined in: [types/providerCatalog.ts:132](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L132)

---

### structuredOutput

> **structuredOutput**: `boolean`

Defined in: [types/providerCatalog.ts:133](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L133)

---

### structuredOutputWithTools

> **structuredOutputWithTools**: `boolean`

Defined in: [types/providerCatalog.ts:134](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L134)

---

### embeddings

> **embeddings**: `boolean`

Defined in: [types/providerCatalog.ts:135](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L135)

---

### thinking

> **thinking**: `boolean`

Defined in: [types/providerCatalog.ts:136](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L136)
