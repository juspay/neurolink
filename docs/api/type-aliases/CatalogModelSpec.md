[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CatalogModelSpec

# Type Alias: CatalogModelSpec

> **CatalogModelSpec** = `object`

Defined in: [types/providerCatalog.ts:29](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L29)

## Properties

### contextWindow?

> `optional` **contextWindow?**: `number`

Defined in: [types/providerCatalog.ts:30](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L30)

---

### maxOutputTokens?

> `optional` **maxOutputTokens?**: `number`

Defined in: [types/providerCatalog.ts:31](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L31)

---

### pricingPerMTok?

> `optional` **pricingPerMTok?**: [`CatalogPricingPerMTok`](CatalogPricingPerMTok.md)

Defined in: [types/providerCatalog.ts:32](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L32)

---

### vision

> **vision**: `boolean`

Defined in: [types/providerCatalog.ts:33](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L33)

---

### status

> **status**: [`CatalogModelStatus`](CatalogModelStatus.md)

Defined in: [types/providerCatalog.ts:34](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L34)

---

### description

> **description**: `string`

Defined in: [types/providerCatalog.ts:35](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L35)

---

### enumMember?

> `optional` **enumMember?**: `string`

Defined in: [types/providerCatalog.ts:41](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L41)

Enum member name override. Default is the derived constant-case of the
model id; REQUIRED where the derived name differs from a pre-existing
exported member (public-surface compatibility).
