[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / WSClientConfig

# Type Alias: WSClientConfig

> **WSClientConfig** = [`ClientConfig`](ClientConfig.md) & `object`

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
