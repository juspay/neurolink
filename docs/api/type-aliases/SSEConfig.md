[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SSEConfig

# Type Alias: SSEConfig

> **SSEConfig** = [`ClientConfig`](ClientConfig.md) & `object`

Defined in: [types/client.ts:1412](https://github.com/juspay/neurolink/blob/release/src/lib/types/client.ts#L1412)

SSE client configuration

## Type Declaration

### autoReconnect?

> `optional` **autoReconnect?**: `boolean`

Auto-reconnect on disconnect (default: true)

### maxReconnectAttempts?

> `optional` **maxReconnectAttempts?**: `number`

Maximum reconnection attempts (default: 5)

### reconnectDelay?

> `optional` **reconnectDelay?**: `number`

Initial reconnection delay in ms (default: 1000)

### maxReconnectDelay?

> `optional` **maxReconnectDelay?**: `number`

Maximum reconnection delay in ms (default: 30000)

### useNativeEventSource?

> `optional` **useNativeEventSource?**: `boolean`

Use native EventSource when available (default: false for more control)
