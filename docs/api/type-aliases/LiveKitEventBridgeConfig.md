[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveKitEventBridgeConfig

# Type Alias: LiveKitEventBridgeConfig

> **LiveKitEventBridgeConfig** = `object`

Configuration for the data-channel event bridge, set on
`LiveKitVoiceAgentConfig.events`.

## Properties

### enabled?

> `optional` **enabled?**: `boolean`

Master switch — the bridge is inert unless this is `true`.

---

### eventsTopic?

> `optional` **eventsTopic?**: `string`

Data-channel topic for outbound events (default "ai-events").

---

### controlTopic?

> `optional` **controlTopic?**: `string`

Data-channel topic for inbound control messages (default "ai-control").

---

### include?

> `optional` **include?**: [`LiveKitVoiceEventType`](LiveKitVoiceEventType.md)[]

If set, only these event types are forwarded (default: all).

---

### maxInlineBytes?

> `optional` **maxInlineBytes?**: `number`

Payloads encoded larger than this many bytes are sent via the chunked text
stream API instead of a single reliable data packet (default 12000).
