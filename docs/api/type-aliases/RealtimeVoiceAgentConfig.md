[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / RealtimeVoiceAgentConfig

# Type Alias: RealtimeVoiceAgentConfig

> **RealtimeVoiceAgentConfig** = `object`

Defined in: [types/livekit.ts:473](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/livekit.ts#L473)

Options for `defineRealtimeVoiceAgent`. Every field is optional: omitted
values fall back to `resolveRealtimeVoiceConfig()` (i.e. the environment), so
a caller can use `defineRealtimeVoiceAgent()` with no arguments and configure
everything via env.

## Properties

### project?

> `optional` **project?**: `string`

Defined in: [types/livekit.ts:474](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/livekit.ts#L474)

---

### location?

> `optional` **location?**: `string`

Defined in: [types/livekit.ts:475](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/livekit.ts#L475)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/livekit.ts:476](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/livekit.ts#L476)

---

### voice?

> `optional` **voice?**: `string`

Defined in: [types/livekit.ts:477](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/livekit.ts#L477)

---

### responseModality?

> `optional` **responseModality?**: `string`

Defined in: [types/livekit.ts:478](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/livekit.ts#L478)

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/livekit.ts:479](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/livekit.ts#L479)

---

### greeting?

> `optional` **greeting?**: `string`

Defined in: [types/livekit.ts:480](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/livekit.ts#L480)

---

### tools?

> `optional` **tools?**: `object`

Defined in: [types/livekit.ts:482](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/livekit.ts#L482)

MCP tool bridging overrides.

#### enabled?

> `optional` **enabled?**: `boolean`

#### mcpUrl?

> `optional` **mcpUrl?**: `string`

---

### eventsTopic?

> `optional` **eventsTopic?**: `string`

Defined in: [types/livekit.ts:487](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/livekit.ts#L487)

Data-channel topic for outbound events (default "ai-events").

---

### controlTopic?

> `optional` **controlTopic?**: `string`

Defined in: [types/livekit.ts:489](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/livekit.ts#L489)

Data-channel topic for inbound control messages (default "ai-control").

---

### onLog?

> `optional` **onLog?**: (`entry`, `ctx`) => `void`

Defined in: [types/livekit.ts:497](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/livekit.ts#L497)

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
