[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / WSClientMessage

# Type Alias: WSClientMessage

> **WSClientMessage** = `object`

Defined in: [types/client.ts:1018](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/client.ts#L1018)

WebSocket message for the dedicated NeuroLinkWebSocket client

## Properties

### type

> **type**: `"subscribe"` \| `"unsubscribe"` \| `"message"` \| `"ping"` \| `"pong"`

Defined in: [types/client.ts:1019](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/client.ts#L1019)

---

### channel?

> `optional` **channel?**: `string`

Defined in: [types/client.ts:1020](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/client.ts#L1020)

---

### payload?

> `optional` **payload?**: `unknown`

Defined in: [types/client.ts:1021](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/client.ts#L1021)

---

### id?

> `optional` **id?**: `string`

Defined in: [types/client.ts:1022](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/client.ts#L1022)
