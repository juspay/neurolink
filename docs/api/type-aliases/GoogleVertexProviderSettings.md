[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / GoogleVertexProviderSettings

# Type Alias: GoogleVertexProviderSettings

> **GoogleVertexProviderSettings** = `object`

Defined in: [types/providers.ts:1299](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1299)

Google Vertex AI provider settings for native SDK configuration
Used with @google/genai SDK in vertexai mode

Note: Authentication is handled via environment variables (GOOGLE_APPLICATION_CREDENTIALS)
or the temporary credentials file approach, not through these settings fields.

## Properties

### project

> **project**: `string`

Defined in: [types/providers.ts:1301](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1301)

Google Cloud project ID

---

### location

> **location**: `string`

Defined in: [types/providers.ts:1303](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1303)

Google Cloud region/location (e.g., 'us-central1')

---

### fetch?

> `optional` **fetch?**: _typeof_ `fetch`

Defined in: [types/providers.ts:1305](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1305)

Optional custom fetch implementation
