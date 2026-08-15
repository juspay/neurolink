[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / SSEConnectionOptions

# Type Alias: SSEConnectionOptions

> **SSEConnectionOptions** = `object`

Defined in: [types/client.ts:1465](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/client.ts#L1465)

SSE connection options

## Properties

### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

Defined in: [types/client.ts:1467](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/client.ts#L1467)

Request headers

---

### credentials?

> `optional` **credentials?**: `RequestCredentials`

Defined in: [types/client.ts:1469](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/client.ts#L1469)

Request credentials

---

### autoReconnect?

> `optional` **autoReconnect?**: `boolean`

Defined in: [types/client.ts:1471](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/client.ts#L1471)

Reconnect on disconnect

---

### reconnectDelay?

> `optional` **reconnectDelay?**: `number`

Defined in: [types/client.ts:1473](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/client.ts#L1473)

Reconnect delay in milliseconds

---

### maxReconnectAttempts?

> `optional` **maxReconnectAttempts?**: `number`

Defined in: [types/client.ts:1475](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/client.ts#L1475)

Maximum reconnect attempts

---

### signal?

> `optional` **signal?**: `AbortSignal`

Defined in: [types/client.ts:1477](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/client.ts#L1477)

Signal for request cancellation
