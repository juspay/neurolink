[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / SSEConfig

# Type Alias: SSEConfig

> **SSEConfig** = [`ClientConfig`](ClientConfig.md) & `object`

Defined in: [types/client.ts:1412](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1412)

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
