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

### backend?

> `optional` **backend?**: [`RealtimeVoiceBackend`](RealtimeVoiceBackend.md)

Realtime backend; omitted means the environment's VOICE_REALTIME_BACKEND, and without it "gemini".

---

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

### xaiBaseURL?

> `optional` **xaiBaseURL?**: `string`

xai only: WebSocket base URL of the realtime endpoint. A `ws://` URL to a host other than localhost, 127.0.0.0/8 or [::1] is refused unless `XAI_REALTIME_ALLOW_INSECURE=true`, because the xAI key would cross the network unencrypted.

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

### memory?

> `optional` **memory?**: [`RealtimeVoiceMemoryConfig`](RealtimeVoiceMemoryConfig.md)

Persist the call's turns to conversation memory and seed the model with
the conversation's recent history. Off unless set. Takes effect only for
a call whose room metadata carries a verified memory binding; otherwise
the call runs exactly as it would without this option, and nothing is
stored.

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
