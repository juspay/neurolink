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
