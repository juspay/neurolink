[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / WSClientConfig

# Type Alias: WSClientConfig

> **WSClientConfig** = [`ClientConfig`](ClientConfig.md) & `object`

Defined in: [types/client.ts:1000](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/client.ts#L1000)

Configuration for the dedicated NeuroLinkWebSocket client

## Type Declaration

### autoReconnect?

> `optional` **autoReconnect?**: `boolean`

Auto-reconnect on disconnect (default: true)

### maxReconnectAttempts?

> `optional` **maxReconnectAttempts?**: `number`

Maximum reconnection attempts (default: 10)

### reconnectDelay?

> `optional` **reconnectDelay?**: `number`

Initial reconnection delay in ms (default: 1000)

### maxReconnectDelay?

> `optional` **maxReconnectDelay?**: `number`

Maximum reconnection delay in ms (default: 30000)

### heartbeatInterval?

> `optional` **heartbeatInterval?**: `number`

Heartbeat interval in ms (default: 30000)

### queueSize?

> `optional` **queueSize?**: `number`

Message queue size when disconnected (default: 100)
