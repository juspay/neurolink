[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicVertexSettings

# Type Alias: AnthropicVertexSettings

> **AnthropicVertexSettings** = `object`

## Properties

### projectId

> **projectId**: `string`

Google Cloud project ID

---

### region

> **region**: `string`

Google Cloud region for Anthropic models (e.g., 'us-east5')

---

### timeout?

> `optional` **timeout?**: `number`

SDK request timeout in milliseconds

---

### maxRetries?

> `optional` **maxRetries?**: `number`

SDK-internal retry budget (transport retries are the orchestrator's job)

---

### baseURL?

> `optional` **baseURL?**: `string`

Endpoint override. The SDK derives
`https://${region}-aiplatform.googleapis.com/v1` by default; a gateway or
a compatible endpoint is reached by setting this instead.

---

### authClient?

> `optional` **authClient?**: [`VertexAnthropicAuthClient`](VertexAnthropicAuthClient.md)

Supply the request credentials directly, bypassing Application Default
Credentials.

Note that `accessToken` on the SDK's own options does NOT do this: the
client stores it and never reads it for auth, so `prepareOptions()` still
awaits ADC and a token-only caller fails with a credentials error that
names nothing useful. `authClient` is the option that actually works.
