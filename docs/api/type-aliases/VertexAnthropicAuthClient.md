[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VertexAnthropicAuthClient

# Type Alias: VertexAnthropicAuthClient

> **VertexAnthropicAuthClient** = `object`

The two members `@anthropic-ai/vertex-sdk` actually uses off an auth client.

Its declared `AuthClient` is far wider, but `prepareOptions()` only ever
awaits `getRequestHeaders()` and reads `projectId` (client.js:109-111).
Naming that narrow surface is what lets a caller supply a token directly
instead of standing up Application Default Credentials.

## Properties

### getRequestHeaders

> **getRequestHeaders**: () => `Promise`\<`Headers`\>

#### Returns

`Promise`\<`Headers`\>

---

### projectId?

> `optional` **projectId?**: `string` \| `null`
