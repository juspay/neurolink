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

Whether a live wire probe proved the vendor accepts native tool
definitions and `response_format` in the SAME request (a 200, not a
schema/tools conflict error). Maps to
OpenAICompatCatalogEntry.supportsStructuredOutputWithTools; `true` lets
ConfiguredOpenAICompatProvider send both instead of suppressing
`response_format` on any request carrying tools (the conservative
default for an unknown endpoint). Only an explicit `true` opts in —
`false` is the same conservative behavior as leaving it unset.

---

### embeddings

> **embeddings**: `boolean`

---

### thinking

> **thinking**: `boolean`
