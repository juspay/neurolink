[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RealtimeEventBridgeParams

# Type Alias: RealtimeEventBridgeParams

> **RealtimeEventBridgeParams** = `object`

Inputs to `attachRealtimeEventBridge`.

## Properties

### room

> **room**: [`LiveKitBridgeRoom`](LiveKitBridgeRoom.md)

The LiveKit room for this call (from the job context).

---

### hitlTimeoutMs?

> `optional` **hitlTimeoutMs?**: `number`

HITL confirmation timeout in ms before a request is auto-declined.

---

### eventsTopic?

> `optional` **eventsTopic?**: `string`

Outbound events topic (default "ai-events").

---

### controlTopic?

> `optional` **controlTopic?**: `string`

Inbound control topic (default "ai-control").

---

### maxInlineBytes?

> `optional` **maxInlineBytes?**: `number`

Payloads larger than this are sent via the chunked text stream (default 12000).
