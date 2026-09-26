[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamingClientConfig

# Type Alias: StreamingClientConfig

> **StreamingClientConfig** = `object`

Streaming client configuration

## Properties

### baseUrl

> **baseUrl**: `string`

Base URL for the API

---

### apiKey?

> `optional` **apiKey?**: `string`

API key

---

### token?

> `optional` **token?**: `string`

Bearer token

---

### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

Default headers

---

### transport?

> `optional` **transport?**: `"sse"` \| `"websocket"`

Preferred transport: 'sse' or 'websocket'
