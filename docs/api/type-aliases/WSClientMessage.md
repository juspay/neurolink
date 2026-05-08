[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / WSClientMessage

# Type Alias: WSClientMessage

> **WSClientMessage** = `object`

Defined in: [types/client.ts:1018](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1018)

WebSocket message for the dedicated NeuroLinkWebSocket client

## Properties

### type

> **type**: `"subscribe"` \| `"unsubscribe"` \| `"message"` \| `"ping"` \| `"pong"`

Defined in: [types/client.ts:1019](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1019)

---

### channel?

> `optional` **channel?**: `string`

Defined in: [types/client.ts:1020](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1020)

---

### payload?

> `optional` **payload?**: `unknown`

Defined in: [types/client.ts:1021](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1021)

---

### id?

> `optional` **id?**: `string`

Defined in: [types/client.ts:1022](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1022)
