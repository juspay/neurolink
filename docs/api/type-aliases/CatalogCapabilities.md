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

"model-dependent" when tool support varies per served model. Maps to
ProviderDescriptor.toolSupport's own "model-dependent" member and
leaves OpenAICompatCatalogEntry.supportsTools unset, so
ConfiguredOpenAICompatProvider.supportsTools() falls back to whichever
of its two remaining sources applies: a model whose own
models.catalog[id].tools is set (see CatalogModelSpec.tools) answers
from that; any other model falls through further, to the
model-registry default (true for an unregistered id) — the same
behavior every model had before CatalogModelSpec.tools existed, and
still correct for a vendor that doesn't reject `tools` for an
unsupported model (the model just never emits tool_calls), e.g.
HuggingFace's router.

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
