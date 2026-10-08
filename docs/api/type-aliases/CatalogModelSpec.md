[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CatalogModelSpec

# Type Alias: CatalogModelSpec

> **CatalogModelSpec** = `object`

## Properties

### contextWindow?

> `optional` **contextWindow?**: `number`

---

### maxOutputTokens?

> `optional` **maxOutputTokens?**: `number`

---

### pricingPerMTok?

> `optional` **pricingPerMTok?**: [`CatalogPricingPerMTok`](CatalogPricingPerMTok.md)

---

### vision

> **vision**: `boolean`

---

### tools?

> `optional` **tools?**: `boolean`

Per-model override of the provider-level `capabilities.tools`, for a
"model-dependent" provider whose vendor docs name which specific models
accept tool definitions (e.g. Reka: "Currently, only Reka Flash
supports function calling"). Absent means "inherit the provider-level
answer", same as every model before this field existed. Only meaningful
when `capabilities.tools` is `"model-dependent"` — a provider that
already declares a plain `true`/`false` has no need for it, since that
single value already applies to every model it serves.

---

### status

> **status**: [`CatalogModelStatus`](CatalogModelStatus.md)

---

### description

> **description**: `string`

---

### enumMember?

> `optional` **enumMember?**: `string`

Enum member name override. Default is the derived constant-case of the
model id; REQUIRED where the derived name differs from a pre-existing
exported member (public-surface compatibility).
