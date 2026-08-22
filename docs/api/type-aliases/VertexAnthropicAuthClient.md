[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VertexAnthropicAuthClient

# Type Alias: VertexAnthropicAuthClient

> **VertexAnthropicAuthClient** = `object`

Defined in: [types/providers.ts:1255](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1255)

The two members `@anthropic-ai/vertex-sdk` actually uses off an auth client.

Its declared `AuthClient` is far wider, but `prepareOptions()` only ever
awaits `getRequestHeaders()` and reads `projectId` (client.js:109-111).
Naming that narrow surface is what lets a caller supply a token directly
instead of standing up Application Default Credentials.

## Properties

### getRequestHeaders

> **getRequestHeaders**: () => `Promise`\<`Record`\<`string`, `string`\>\>

Defined in: [types/providers.ts:1256](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1256)

#### Returns

`Promise`\<`Record`\<`string`, `string`\>\>

---

### projectId?

> `optional` **projectId?**: `string` \| `null`

Defined in: [types/providers.ts:1257](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1257)
