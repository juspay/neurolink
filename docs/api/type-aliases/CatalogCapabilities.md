[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CatalogCapabilities

# Type Alias: CatalogCapabilities

> **CatalogCapabilities** = `object`

## Properties

### text

> **text**: `boolean`

---

### streaming

> **streaming**: `boolean`

---

### tools

> **tools**: `boolean` \| `"model-dependent"`

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

---

### structuredOutput

> **structuredOutput**: `boolean`

---

### structuredOutputWithTools

> **structuredOutputWithTools**: `boolean`

---

### embeddings

> **embeddings**: `boolean`

---

### thinking

> **thinking**: `boolean`
