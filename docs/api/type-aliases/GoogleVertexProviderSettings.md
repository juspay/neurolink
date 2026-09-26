[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / GoogleVertexProviderSettings

# Type Alias: GoogleVertexProviderSettings

> **GoogleVertexProviderSettings** = `object`

Google Vertex AI provider settings for native SDK configuration
Used with @google/genai SDK in vertexai mode

Note: Authentication is handled via environment variables (GOOGLE_APPLICATION_CREDENTIALS)
or the temporary credentials file approach, not through these settings fields.

## Properties

### project

> **project**: `string`

Google Cloud project ID

---

### location

> **location**: `string`

Google Cloud region/location (e.g., 'us-central1')

---

### fetch?

> `optional` **fetch?**: _typeof_ `fetch`

Optional custom fetch implementation
