[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / GoogleVertexProviderSettings

# Type Alias: GoogleVertexProviderSettings

> **GoogleVertexProviderSettings** = `object`

Defined in: [types/providers.ts:1304](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1304)

Google Vertex AI provider settings for native SDK configuration
Used with @google/genai SDK in vertexai mode

Note: Authentication is handled via environment variables (GOOGLE_APPLICATION_CREDENTIALS)
or the temporary credentials file approach, not through these settings fields.

## Properties

### project

> **project**: `string`

Defined in: [types/providers.ts:1306](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1306)

Google Cloud project ID

---

### location

> **location**: `string`

Defined in: [types/providers.ts:1308](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1308)

Google Cloud region/location (e.g., 'us-central1')

---

### fetch?

> `optional` **fetch?**: _typeof_ `fetch`

Defined in: [types/providers.ts:1310](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1310)

Optional custom fetch implementation
