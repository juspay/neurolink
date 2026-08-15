[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientWebSocketOptions

# Type Alias: ClientWebSocketOptions

> **ClientWebSocketOptions** = `object`

Defined in: [types/client.ts:954](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/client.ts#L954)

WebSocket connection options

## Properties

### url

> **url**: `string`

Defined in: [types/client.ts:956](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/client.ts#L956)

WebSocket URL

---

### protocols?

> `optional` **protocols?**: `string` \| `string`[]

Defined in: [types/client.ts:958](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/client.ts#L958)

Protocols

---

### autoReconnect?

> `optional` **autoReconnect?**: `boolean`

Defined in: [types/client.ts:960](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/client.ts#L960)

Auto-reconnect on disconnect

---

### reconnectInterval?

> `optional` **reconnectInterval?**: `number`

Defined in: [types/client.ts:962](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/client.ts#L962)

Reconnect interval in ms

---

### maxReconnectAttempts?

> `optional` **maxReconnectAttempts?**: `number`

Defined in: [types/client.ts:964](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/client.ts#L964)

Maximum reconnect attempts

---

### heartbeatInterval?

> `optional` **heartbeatInterval?**: `number`

Defined in: [types/client.ts:966](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/client.ts#L966)

Heartbeat interval in ms
