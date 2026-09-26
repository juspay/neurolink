[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveKitVoiceAgentConfig

# Type Alias: LiveKitVoiceAgentConfig

> **LiveKitVoiceAgentConfig** = `object`

Options for `defineVoiceAgent` — the agent definition placed as the default
export of the worker entry file.

LiveKit runs each call as a Job in its own child process and re-imports the
entry file there, so the NeuroLink instance cannot be passed as a live object
from a parent. Instead, `createNeuroLink` is invoked **inside each job
process** to build the brain (and register its tools) for that call.

## Properties

### createNeuroLink

> **createNeuroLink**: () => [`LiveKitNeuroLinkStreamer`](LiveKitNeuroLinkStreamer.md) \| `Promise`\<[`LiveKitNeuroLinkStreamer`](LiveKitNeuroLinkStreamer.md)\>

Factory that builds the NeuroLink instance for a job process.
Called once per call, inside the job's own process.

#### Returns

[`LiveKitNeuroLinkStreamer`](LiveKitNeuroLinkStreamer.md) \| `Promise`\<[`LiveKitNeuroLinkStreamer`](LiveKitNeuroLinkStreamer.md)\>

---

### stt

> **stt**: [`LiveKitSttConfig`](LiveKitSttConfig.md)

Realtime speech-to-text selection.

---

### tts

> **tts**: [`LiveKitTtsConfig`](LiveKitTtsConfig.md)

Realtime text-to-speech selection.

---

### provider?

> `optional` **provider?**: `string`

LLM provider/model overrides (default to env-resolved values).

---

### model?

> `optional` **model?**: `string`

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

---

### temperature?

> `optional` **temperature?**: `number`

---

### maxTokens?

> `optional` **maxTokens?**: `number`

---

### conversationIdPrefix?

> `optional` **conversationIdPrefix?**: `string`

Prefix used when deriving a per-room conversation id (default "voice").

---

### userId?

> `optional` **userId?**: `string`

Optional user id recorded alongside memory.

---

### greeting?

> `optional` **greeting?**: `string`

---

### vad?

> `optional` **vad?**: [`LiveKitVadConfig`](LiveKitVadConfig.md)

Silero VAD tuning (stricter = ignores background noise).

---

### turn?

> `optional` **turn?**: [`LiveKitTurnConfig`](LiveKitTurnConfig.md)

Turn-detection tuning (VAD vs STT endpointing, delays).

---

### interruption?

> `optional` **interruption?**: [`LiveKitInterruptionConfig`](LiveKitInterruptionConfig.md)

Interruption tuning (require words/duration so noise can't barge in).

---

### events?

> `optional` **events?**: [`LiveKitEventBridgeConfig`](LiveKitEventBridgeConfig.md)

Data-channel event bridge: forward NeuroLink events (text, tool calls,
tool results, HITL prompts, status) to the browser over the LiveKit data
channel, and accept control messages (HITL responses) back. Disabled
unless `enabled` is `true`.
