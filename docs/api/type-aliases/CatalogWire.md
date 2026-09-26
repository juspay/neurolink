[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CatalogWire

# Type Alias: CatalogWire

> **CatalogWire** = `object`

## Properties

### baseURL?

> `optional` **baseURL?**: `string`

---

### baseURLTemplate?

> `optional` **baseURLTemplate?**: `string`

---

### extraCredentials?

> `optional` **extraCredentials?**: `string`[]

---

### missingCredentialMessage?

> `optional` **missingCredentialMessage?**: `string`

---

### envOverrides?

> `optional` **envOverrides?**: `object`

#### apiKey?

> `optional` **apiKey?**: `string`

#### baseURL?

> `optional` **baseURL?**: `string`

#### model?

> `optional` **model?**: `string`

---

### apiKeyFallbackEnvVars?

> `optional` **apiKeyFallbackEnvVars?**: `string`[]

Additional env vars validateApiKey() tries, in order, when the primary
apiKeyEnvVar is unset (e.g. HuggingFace's HF_TOKEN alongside
HUGGINGFACE_API_KEY). Consumed by buildCatalogConfigOptions() via
ProviderConfigOptions.fallbackEnvVars.
