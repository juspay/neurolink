[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / RealtimeVoiceConfig

# Type Alias: RealtimeVoiceConfig

> **RealtimeVoiceConfig** = `object`

Defined in: [types/livekit.ts:426](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/livekit.ts#L426)

Realtime voice configuration resolved from the environment.

In speech-to-speech mode one realtime model (Gemini Live on Vertex) does STT,
reasoning, TTS, and turn detection — so there is no separate STT/TTS/VAD/EOU
config. `resolveRealtimeVoiceConfig` fills every field from `process.env`
(with defaults); `RealtimeVoiceAgentConfig` lets a caller override any of them.

## Properties

### project

> **project**: `string` \| `undefined`

Defined in: [types/livekit.ts:428](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/livekit.ts#L428)

Vertex project id (from VERTEX*PROJECT / GOOGLE_AUTH*\* / GOOGLE_CLOUD_PROJECT_ID).

---

### location

> **location**: `string`

Defined in: [types/livekit.ts:430](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/livekit.ts#L430)

Vertex location; native-audio Live is served on `global`, not regionally.

---

### model

> **model**: `string`

Defined in: [types/livekit.ts:432](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/livekit.ts#L432)

Realtime model id (e.g. "gemini-live-2.5-flash").

---

### voice

> **voice**: `string` \| `undefined`

Defined in: [types/livekit.ts:434](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/livekit.ts#L434)

Optional Gemini voice name; omit for the plugin default.

---

### responseModality

> **responseModality**: `string`

Defined in: [types/livekit.ts:436](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/livekit.ts#L436)

Response modality: "AUDIO" (native S2S) or "TEXT" (half-cascade).

---

### systemPrompt

> **systemPrompt**: `string`

Defined in: [types/livekit.ts:438](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/livekit.ts#L438)

System prompt / instructions for the agent.

---

### greeting

> **greeting**: `string`

Defined in: [types/livekit.ts:440](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/livekit.ts#L440)

Opening line the agent speaks on connect ("" disables).

---

### toolsEnabled

> **toolsEnabled**: `boolean`

Defined in: [types/livekit.ts:442](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/livekit.ts#L442)

Whether to bridge Lighthouse MCP tools as Gemini function tools.

---

### mcpUrl

> **mcpUrl**: `string`

Defined in: [types/livekit.ts:444](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/livekit.ts#L444)

Full URL of the MCP server the tools are bridged from.

---

### emptyRoomGraceMs

> **emptyRoomGraceMs**: `number`

Defined in: [types/livekit.ts:446](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/livekit.ts#L446)

Grace period after the caller leaves before the job shuts down (ms).

---

### joinDeadlineMs

> **joinDeadlineMs**: `number`

Defined in: [types/livekit.ts:448](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/livekit.ts#L448)

Deadline for a participant to join before the job shuts down (ms).

---

### hitlTimeoutMs

> **hitlTimeoutMs**: `number`

Defined in: [types/livekit.ts:450](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/livekit.ts#L450)

How long a HITL confirmation waits before being treated as a decline (ms).

---

### metricsIntervalMs

> **metricsIntervalMs**: `number`

Defined in: [types/livekit.ts:452](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/livekit.ts#L452)

Interval for the RSS/heap metrics log (ms).
