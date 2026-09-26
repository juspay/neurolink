[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientConfig

# Type Alias: ClientConfig

> **ClientConfig** = `object`

Client configuration options for initializing the NeuroLink client

## Properties

### baseUrl

> **baseUrl**: `string`

Base URL for the NeuroLink API

---

### apiKey?

> `optional` **apiKey?**: `string`

API key for authentication (header-based)

---

### token?

> `optional` **token?**: `string`

Bearer token for authentication

---

### timeout?

> `optional` **timeout?**: `number`

Default timeout in milliseconds (default: 30000)

---

### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

Default headers to include in all requests

---

### retry?

> `optional` **retry?**: [`ClientRetryConfig`](ClientRetryConfig.md)

Retry configuration for failed requests

---

### debug?

> `optional` **debug?**: `boolean`

Enable debug logging

---

### fetch?

> `optional` **fetch?**: _typeof_ `fetch`

Custom fetch implementation (for environments without native fetch)

---

### wsUrl?

> `optional` **wsUrl?**: `string`

WebSocket URL override (defaults to ws(s) version of baseUrl)
