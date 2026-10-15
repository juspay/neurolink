[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RealtimeVoiceConfig

# Type Alias: RealtimeVoiceConfig

> **RealtimeVoiceConfig** = `object`

Realtime voice configuration resolved from the environment.

In speech-to-speech mode one realtime model (Gemini Live on Vertex, or xAI
Grok Voice) does STT, reasoning, TTS, and turn detection — so there is no
separate STT/TTS/VAD/EOU config. `resolveRealtimeVoiceConfig` fills every
field from `process.env` (with defaults); `RealtimeVoiceAgentConfig` lets a
caller override any of them. The API key of the xai backend is deliberately
not part of the config: the xAI plugin reads `XAI_API_KEY` itself.

## Properties

### backend

> **backend**: [`RealtimeVoiceBackend`](RealtimeVoiceBackend.md)

Which realtime model family handles the call (VOICE_REALTIME_BACKEND; default "gemini").

---

### project

> **project**: `string` \| `undefined`

Vertex project id (from VERTEX*PROJECT / GOOGLE_AUTH*\* / GOOGLE_CLOUD_PROJECT_ID). Gemini only.

---

### location

> **location**: `string`

Vertex location; native-audio Live is served on `global`, not regionally. Gemini only.

---

### model

> **model**: `string`

Realtime model id (e.g. "gemini-live-2.5-flash" for gemini, "grok-voice-3.0" for xai).

---

### voice

> **voice**: `string` \| `undefined`

Optional voice name for either backend; omit for the plugin default.

---

### xaiBaseURL

> **xaiBaseURL**: `string` \| `undefined`

xai only: WebSocket base URL of the realtime endpoint (XAI_REALTIME_BASE_URL); unset keeps the plugin's own endpoint.

---

### responseModality

> **responseModality**: `string`

Response modality: "AUDIO" (native S2S) or "TEXT" (half-cascade). Gemini only.

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

Whether to bridge Lighthouse MCP tools as function tools of the realtime model (either backend).

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
