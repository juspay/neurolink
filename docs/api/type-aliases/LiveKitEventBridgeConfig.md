[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveKitEventBridgeConfig

# Type Alias: LiveKitEventBridgeConfig

> **LiveKitEventBridgeConfig** = `object`

Defined in: [types/livekit.ts:342](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/livekit.ts#L342)

Configuration for the data-channel event bridge, set on
`LiveKitVoiceAgentConfig.events`.

## Properties

### enabled?

> `optional` **enabled?**: `boolean`

Defined in: [types/livekit.ts:344](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/livekit.ts#L344)

Master switch — the bridge is inert unless this is `true`.

---

### eventsTopic?

> `optional` **eventsTopic?**: `string`

Defined in: [types/livekit.ts:346](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/livekit.ts#L346)

Data-channel topic for outbound events (default "ai-events").

---

### controlTopic?

> `optional` **controlTopic?**: `string`

Defined in: [types/livekit.ts:348](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/livekit.ts#L348)

Data-channel topic for inbound control messages (default "ai-control").

---

### include?

> `optional` **include?**: [`LiveKitVoiceEventType`](LiveKitVoiceEventType.md)[]

Defined in: [types/livekit.ts:350](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/livekit.ts#L350)

If set, only these event types are forwarded (default: all).

---

### maxInlineBytes?

> `optional` **maxInlineBytes?**: `number`

Defined in: [types/livekit.ts:355](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/livekit.ts#L355)

Payloads encoded larger than this many bytes are sent via the chunked text
stream API instead of a single reliable data packet (default 12000).
