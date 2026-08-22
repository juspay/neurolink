[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveKitVoiceAgentConfig

# Type Alias: LiveKitVoiceAgentConfig

> **LiveKitVoiceAgentConfig** = `object`

Defined in: [types/livekit.ts:151](https://github.com/juspay/neurolink/blob/release/src/lib/types/livekit.ts#L151)

Options for `defineVoiceAgent` — the agent definition placed as the default
export of the worker entry file.

LiveKit runs each call as a Job in its own child process and re-imports the
entry file there, so the NeuroLink instance cannot be passed as a live object
from a parent. Instead, `createNeuroLink` is invoked **inside each job
process** to build the brain (and register its tools) for that call.

## Properties

### createNeuroLink

> **createNeuroLink**: () => [`LiveKitNeuroLinkStreamer`](LiveKitNeuroLinkStreamer.md) \| `Promise`\<[`LiveKitNeuroLinkStreamer`](LiveKitNeuroLinkStreamer.md)\>

Defined in: [types/livekit.ts:156](https://github.com/juspay/neurolink/blob/release/src/lib/types/livekit.ts#L156)

Factory that builds the NeuroLink instance for a job process.
Called once per call, inside the job's own process.

#### Returns

[`LiveKitNeuroLinkStreamer`](LiveKitNeuroLinkStreamer.md) \| `Promise`\<[`LiveKitNeuroLinkStreamer`](LiveKitNeuroLinkStreamer.md)\>

---

### stt

> **stt**: [`LiveKitSttConfig`](LiveKitSttConfig.md)

Defined in: [types/livekit.ts:160](https://github.com/juspay/neurolink/blob/release/src/lib/types/livekit.ts#L160)

Realtime speech-to-text selection.

---

### tts

> **tts**: [`LiveKitTtsConfig`](LiveKitTtsConfig.md)

Defined in: [types/livekit.ts:162](https://github.com/juspay/neurolink/blob/release/src/lib/types/livekit.ts#L162)

Realtime text-to-speech selection.

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/livekit.ts:164](https://github.com/juspay/neurolink/blob/release/src/lib/types/livekit.ts#L164)

LLM provider/model overrides (default to env-resolved values).

---

### model?

> `optional` **model?**: `string`

Defined in: [types/livekit.ts:165](https://github.com/juspay/neurolink/blob/release/src/lib/types/livekit.ts#L165)

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/livekit.ts:166](https://github.com/juspay/neurolink/blob/release/src/lib/types/livekit.ts#L166)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/livekit.ts:167](https://github.com/juspay/neurolink/blob/release/src/lib/types/livekit.ts#L167)

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/livekit.ts:168](https://github.com/juspay/neurolink/blob/release/src/lib/types/livekit.ts#L168)

---

### conversationIdPrefix?

> `optional` **conversationIdPrefix?**: `string`

Defined in: [types/livekit.ts:170](https://github.com/juspay/neurolink/blob/release/src/lib/types/livekit.ts#L170)

Prefix used when deriving a per-room conversation id (default "voice").

---

### userId?

> `optional` **userId?**: `string`

Defined in: [types/livekit.ts:172](https://github.com/juspay/neurolink/blob/release/src/lib/types/livekit.ts#L172)

Optional user id recorded alongside memory.

---

### greeting?

> `optional` **greeting?**: `string`

Defined in: [types/livekit.ts:173](https://github.com/juspay/neurolink/blob/release/src/lib/types/livekit.ts#L173)

---

### vad?

> `optional` **vad?**: [`LiveKitVadConfig`](LiveKitVadConfig.md)

Defined in: [types/livekit.ts:175](https://github.com/juspay/neurolink/blob/release/src/lib/types/livekit.ts#L175)

Silero VAD tuning (stricter = ignores background noise).

---

### turn?

> `optional` **turn?**: [`LiveKitTurnConfig`](LiveKitTurnConfig.md)

Defined in: [types/livekit.ts:177](https://github.com/juspay/neurolink/blob/release/src/lib/types/livekit.ts#L177)

Turn-detection tuning (VAD vs STT endpointing, delays).

---

### interruption?

> `optional` **interruption?**: [`LiveKitInterruptionConfig`](LiveKitInterruptionConfig.md)

Defined in: [types/livekit.ts:179](https://github.com/juspay/neurolink/blob/release/src/lib/types/livekit.ts#L179)

Interruption tuning (require words/duration so noise can't barge in).

---

### events?

> `optional` **events?**: [`LiveKitEventBridgeConfig`](LiveKitEventBridgeConfig.md)

Defined in: [types/livekit.ts:186](https://github.com/juspay/neurolink/blob/release/src/lib/types/livekit.ts#L186)

Data-channel event bridge: forward NeuroLink events (text, tool calls,
tool results, HITL prompts, status) to the browser over the LiveKit data
channel, and accept control messages (HITL responses) back. Disabled
unless `enabled` is `true`.
