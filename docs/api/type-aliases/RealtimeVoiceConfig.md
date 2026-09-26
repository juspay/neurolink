[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RealtimeVoiceConfig

# Type Alias: RealtimeVoiceConfig

> **RealtimeVoiceConfig** = `object`

Realtime voice configuration resolved from the environment.

In speech-to-speech mode one realtime model (Gemini Live on Vertex) does STT,
reasoning, TTS, and turn detection — so there is no separate STT/TTS/VAD/EOU
config. `resolveRealtimeVoiceConfig` fills every field from `process.env`
(with defaults); `RealtimeVoiceAgentConfig` lets a caller override any of them.

## Properties

### project

> **project**: `string` \| `undefined`

Vertex project id (from VERTEX*PROJECT / GOOGLE_AUTH*\* / GOOGLE_CLOUD_PROJECT_ID).

---

### location

> **location**: `string`

Vertex location; native-audio Live is served on `global`, not regionally.

---

### model

> **model**: `string`

Realtime model id (e.g. "gemini-live-2.5-flash").

---

### voice

> **voice**: `string` \| `undefined`

Optional Gemini voice name; omit for the plugin default.

---

### responseModality

> **responseModality**: `string`

Response modality: "AUDIO" (native S2S) or "TEXT" (half-cascade).

---

### systemPrompt

> **systemPrompt**: `string`

System prompt / instructions for the agent.

---

### greeting

> **greeting**: `string`

Opening line the agent speaks on connect ("" disables).

---

### toolsEnabled

> **toolsEnabled**: `boolean`

Whether to bridge Lighthouse MCP tools as Gemini function tools.

---

### mcpUrl

> **mcpUrl**: `string`

Full URL of the MCP server the tools are bridged from.

---

### emptyRoomGraceMs

> **emptyRoomGraceMs**: `number`

Grace period after the caller leaves before the job shuts down (ms).

---

### joinDeadlineMs

> **joinDeadlineMs**: `number`

Deadline for a participant to join before the job shuts down (ms).

---

### hitlTimeoutMs

> **hitlTimeoutMs**: `number`

How long a HITL confirmation waits before being treated as a decline (ms).

---

### metricsIntervalMs

> **metricsIntervalMs**: `number`

Interval for the RSS/heap metrics log (ms).
