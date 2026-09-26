[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SSEConnectionOptions

# Type Alias: SSEConnectionOptions

> **SSEConnectionOptions** = `object`

SSE connection options

## Properties

### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

Request headers

---

### credentials?

> `optional` **credentials?**: `RequestCredentials`

Request credentials

---

### autoReconnect?

> `optional` **autoReconnect?**: `boolean`

Reconnect on disconnect

---

### reconnectDelay?

> `optional` **reconnectDelay?**: `number`

Reconnect delay in milliseconds

---

### maxReconnectAttempts?

> `optional` **maxReconnectAttempts?**: `number`

Maximum reconnect attempts

---

### signal?

> `optional` **signal?**: `AbortSignal`

Signal for request cancellation
