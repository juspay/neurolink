[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RealtimeVoiceAgentConfig

# Type Alias: RealtimeVoiceAgentConfig

> **RealtimeVoiceAgentConfig** = `object`

Options for `defineRealtimeVoiceAgent`. Every field is optional: omitted
values fall back to `resolveRealtimeVoiceConfig()` (i.e. the environment), so
a caller can use `defineRealtimeVoiceAgent()` with no arguments and configure
everything via env.

## Properties

### project?

> `optional` **project?**: `string`

---

### location?

> `optional` **location?**: `string`

---

### model?

> `optional` **model?**: `string`

---

### voice?

> `optional` **voice?**: `string`

---

### responseModality?

> `optional` **responseModality?**: `string`

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

---

### greeting?

> `optional` **greeting?**: `string`

---

### tools?

> `optional` **tools?**: `object`

MCP tool bridging overrides.

#### enabled?

> `optional` **enabled?**: `boolean`

#### mcpUrl?

> `optional` **mcpUrl?**: `string`

---

### eventsTopic?

> `optional` **eventsTopic?**: `string`

Data-channel topic for outbound events (default "ai-events").

---

### controlTopic?

> `optional` **controlTopic?**: `string`

Data-channel topic for inbound control messages (default "ai-control").

---

### onLog?

> `optional` **onLog?**: (`entry`, `ctx`) => `void`

Optional sink for the agent's own logs. When set, the realtime agent wires
NeuroLink's logger to this callback for the duration of the call, so a host
can forward worker logs into its logging pipeline. Each record is tagged
with per-call context (the room name). Subject to the logger's level gate:
without debug mode only `error` records are emitted (set `NEUROLINK_DEBUG`).

#### Parameters

##### entry

[`RealtimeVoiceLogEntry`](RealtimeVoiceLogEntry.md)

##### ctx

[`RealtimeVoiceLogContext`](RealtimeVoiceLogContext.md)

#### Returns

`void`
