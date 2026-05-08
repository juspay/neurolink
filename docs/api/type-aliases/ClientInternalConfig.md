[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientInternalConfig

# Type Alias: ClientInternalConfig

> **ClientInternalConfig** = `object`

Defined in: [types/client.ts:1597](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1597)

Superset internal config for SSE and WebSocket client wrappers.
The 9 shared fields are required. Protocol-specific fields
(useNativeEventSource for SSE; heartbeatInterval/queueSize for WS)
are optional — each client populates only its own fields.

## Properties

### baseUrl

> **baseUrl**: `string`

Defined in: [types/client.ts:1598](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1598)

---

### apiKey

> **apiKey**: `string`

Defined in: [types/client.ts:1599](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1599)

---

### token

> **token**: `string`

Defined in: [types/client.ts:1600](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1600)

---

### timeout

> **timeout**: `number`

Defined in: [types/client.ts:1601](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1601)

---

### headers

> **headers**: `Record`\<`string`, `string`\>

Defined in: [types/client.ts:1602](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1602)

---

### autoReconnect

> **autoReconnect**: `boolean`

Defined in: [types/client.ts:1603](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1603)

---

### maxReconnectAttempts

> **maxReconnectAttempts**: `number`

Defined in: [types/client.ts:1604](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1604)

---

### reconnectDelay

> **reconnectDelay**: `number`

Defined in: [types/client.ts:1605](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1605)

---

### maxReconnectDelay

> **maxReconnectDelay**: `number`

Defined in: [types/client.ts:1606](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1606)

---

### useNativeEventSource?

> `optional` **useNativeEventSource?**: `boolean`

Defined in: [types/client.ts:1607](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1607)

---

### heartbeatInterval?

> `optional` **heartbeatInterval?**: `number`

Defined in: [types/client.ts:1608](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1608)

---

### queueSize?

> `optional` **queueSize?**: `number`

Defined in: [types/client.ts:1609](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1609)
