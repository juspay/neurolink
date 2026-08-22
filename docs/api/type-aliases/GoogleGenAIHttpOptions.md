[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / GoogleGenAIHttpOptions

# Type Alias: GoogleGenAIHttpOptions

> **GoogleGenAIHttpOptions** = `object`

Defined in: [types/providers.ts:1201](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/providers.ts#L1201)

HTTP options for Google GenAI SDK
Allows custom fetch implementation for proxy support

## Properties

### fetch?

> `optional` **fetch?**: _typeof_ `fetch`

Defined in: [types/providers.ts:1203](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/providers.ts#L1203)

Custom fetch implementation for proxy support

---

### baseUrl?

> `optional` **baseUrl?**: `string`

Defined in: [types/providers.ts:1205](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/providers.ts#L1205)

Override the API base URL (e.g. a corporate proxy or mock endpoint)
