[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicVertexSettings

# Type Alias: AnthropicVertexSettings

> **AnthropicVertexSettings** = `object`

Defined in: [types/providers.ts:1282](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1282)

## Properties

### projectId

> **projectId**: `string`

Defined in: [types/providers.ts:1284](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1284)

Google Cloud project ID

---

### region

> **region**: `string`

Defined in: [types/providers.ts:1286](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1286)

Google Cloud region for Anthropic models (e.g., 'us-east5')

---

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/providers.ts:1288](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1288)

SDK request timeout in milliseconds

---

### maxRetries?

> `optional` **maxRetries?**: `number`

Defined in: [types/providers.ts:1290](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1290)

SDK-internal retry budget (transport retries are the orchestrator's job)

---

### baseURL?

> `optional` **baseURL?**: `string`

Defined in: [types/providers.ts:1296](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1296)

Endpoint override. The SDK derives
`https://${region}-aiplatform.googleapis.com/v1` by default; a gateway or
a compatible endpoint is reached by setting this instead.

---

### authClient?

> `optional` **authClient?**: [`VertexAnthropicAuthClient`](VertexAnthropicAuthClient.md)

Defined in: [types/providers.ts:1306](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1306)

Supply the request credentials directly, bypassing Application Default
Credentials.

Note that `accessToken` on the SDK's own options does NOT do this: the
client stores it and never reads it for auth, so `prepareOptions()` still
awaits ADC and a token-only caller fails with a credentials error that
names nothing useful. `authClient` is the option that actually works.
