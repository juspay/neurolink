[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientInternalConfig

# Type Alias: ClientInternalConfig

> **ClientInternalConfig** = `object`

Superset internal config for SSE and WebSocket client wrappers.
The 9 shared fields are required. Protocol-specific fields
(useNativeEventSource for SSE; heartbeatInterval/queueSize for WS)
are optional — each client populates only its own fields.

## Properties

### baseUrl

> **baseUrl**: `string`

---

### apiKey

> **apiKey**: `string`

---

### token

> **token**: `string`

---

### timeout

> **timeout**: `number`

---

### headers

> **headers**: `Record`\<`string`, `string`\>

---

### autoReconnect

> **autoReconnect**: `boolean`

---

### maxReconnectAttempts

> **maxReconnectAttempts**: `number`

---

### reconnectDelay

> **reconnectDelay**: `number`

---

### maxReconnectDelay

> **maxReconnectDelay**: `number`

---

### useNativeEventSource?

> `optional` **useNativeEventSource?**: `boolean`

---

### heartbeatInterval?

> `optional` **heartbeatInterval?**: `number`

---

### queueSize?

> `optional` **queueSize?**: `number`
