[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / RealtimeEventBridgeParams

# Type Alias: RealtimeEventBridgeParams

> **RealtimeEventBridgeParams** = `object`

Defined in: [types/livekit.ts:531](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/livekit.ts#L531)

Inputs to `attachRealtimeEventBridge`.

## Properties

### room

> **room**: [`LiveKitBridgeRoom`](LiveKitBridgeRoom.md)

Defined in: [types/livekit.ts:533](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/livekit.ts#L533)

The LiveKit room for this call (from the job context).

---

### hitlTimeoutMs?

> `optional` **hitlTimeoutMs?**: `number`

Defined in: [types/livekit.ts:535](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/livekit.ts#L535)

HITL confirmation timeout in ms before a request is auto-declined.

---

### eventsTopic?

> `optional` **eventsTopic?**: `string`

Defined in: [types/livekit.ts:537](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/livekit.ts#L537)

Outbound events topic (default "ai-events").

---

### controlTopic?

> `optional` **controlTopic?**: `string`

Defined in: [types/livekit.ts:539](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/livekit.ts#L539)

Inbound control topic (default "ai-control").

---

### maxInlineBytes?

> `optional` **maxInlineBytes?**: `number`

Defined in: [types/livekit.ts:541](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/livekit.ts#L541)

Payloads larger than this are sent via the chunked text stream (default 12000).
