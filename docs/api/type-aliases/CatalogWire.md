[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CatalogWire

# Type Alias: CatalogWire

> **CatalogWire** = `object`

Defined in: [types/providerCatalog.ts:44](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L44)

## Properties

### baseURL?

> `optional` **baseURL?**: `string`

Defined in: [types/providerCatalog.ts:45](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L45)

---

### baseURLTemplate?

> `optional` **baseURLTemplate?**: `string`

Defined in: [types/providerCatalog.ts:46](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L46)

---

### extraCredentials?

> `optional` **extraCredentials?**: `string`[]

Defined in: [types/providerCatalog.ts:47](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L47)

---

### missingCredentialMessage?

> `optional` **missingCredentialMessage?**: `string`

Defined in: [types/providerCatalog.ts:48](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L48)

---

### envOverrides?

> `optional` **envOverrides?**: `object`

Defined in: [types/providerCatalog.ts:49](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L49)

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

#### model?

> `optional` **model?**: `string`

---

### apiKeyFallbackEnvVars?

> `optional` **apiKeyFallbackEnvVars?**: `string`[]

Defined in: [types/providerCatalog.ts:54](https://github.com/juspay/neurolink/blob/release/src/lib/types/providerCatalog.ts#L54)

Additional env vars validateApiKey() tries, in order, when the primary
apiKeyEnvVar is unset (e.g. HuggingFace's HF_TOKEN alongside
HUGGINGFACE_API_KEY). Consumed by buildCatalogConfigOptions() via
ProviderConfigOptions.fallbackEnvVars.
