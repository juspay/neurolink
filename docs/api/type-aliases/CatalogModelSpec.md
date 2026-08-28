[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CatalogModelSpec

# Type Alias: CatalogModelSpec

> **CatalogModelSpec** = `object`

Defined in: [types/providerCatalog.ts:16](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L16)

## Properties

### contextWindow?

> `optional` **contextWindow?**: `number`

Defined in: [types/providerCatalog.ts:17](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L17)

---

### maxOutputTokens?

> `optional` **maxOutputTokens?**: `number`

Defined in: [types/providerCatalog.ts:18](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L18)

---

### pricingPerMTok?

> `optional` **pricingPerMTok?**: [`CatalogPricingPerMTok`](CatalogPricingPerMTok.md)

Defined in: [types/providerCatalog.ts:19](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L19)

---

### vision

> **vision**: `boolean`

Defined in: [types/providerCatalog.ts:20](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L20)

---

### status

> **status**: [`CatalogModelStatus`](CatalogModelStatus.md)

Defined in: [types/providerCatalog.ts:21](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L21)

---

### description

> **description**: `string`

Defined in: [types/providerCatalog.ts:22](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L22)

---

### enumMember?

> `optional` **enumMember?**: `string`

Defined in: [types/providerCatalog.ts:28](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L28)

Enum member name override. Default is the derived constant-case of the
model id; REQUIRED where the derived name differs from a pre-existing
exported member (public-surface compatibility).
