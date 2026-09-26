[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerVoiceSessionState

# Type Alias: ServerVoiceSessionState

> **ServerVoiceSessionState** = `object`

Per-session mutable state for one voice WebSocket connection.

Threaded through the voice connection helper functions so each connection
has fully isolated turn / TTS / VAD / barge-in state. The class types
(`FrameBus`, `TurnManager`, `CartesiaStream`) are imported as types here so
that this file remains the single source of truth — consumers import this
type via the barrel and do not redefine it locally.

(Server-prefixed per CLAUDE.md Rule 9 — server-tier type.)

## Properties

### cobra

> **cobra**: [`CobraInstance`](CobraInstance.md) \| `null`

---

### FRAME_LENGTH

> **FRAME_LENGTH**: `number`

---

### FRAME_BYTES

> **FRAME_BYTES**: `number`

---

### bus

> **bus**: `FrameBus`

---

### turnManager

> **turnManager**: `TurnManager`

---

### sonioxWs

> **sonioxWs**: `WebSocket` \| `null`

---

### keepAliveTimer

> **keepAliveTimer**: `NodeJS.Timeout` \| `null`

---

### sonioxReconnectTimer

> **sonioxReconnectTimer**: `ReturnType`\<_typeof_ `setTimeout`\> \| `null`

---

### sessionClosed

> **sessionClosed**: `boolean`

---

### transcriptBuffer

> **transcriptBuffer**: `string`

---

### activeTTS

> **activeTTS**: `CartesiaStream` \| `null`

---

### conversation

> **conversation**: [`ConversationMessage`](ConversationMessage.md)[]

---

### currentTurnId

> **currentTurnId**: `number`

---

### activePipelineTurnId

> **activePipelineTurnId**: `number` \| `null`

---

### turnAborters

> **turnAborters**: `Set`\<\{ `aborted`: `boolean`; \}\>

---

### playbackResetTimer

> **playbackResetTimer**: `NodeJS.Timeout` \| `null`

---

### bargeInLockedUntil

> **bargeInLockedUntil**: `number`

---

### isSpeaking

> **isSpeaking**: `boolean`

---

### silenceFrameCount

> **silenceFrameCount**: `number`

---

### voiceFrameCount

> **voiceFrameCount**: `number`

---

### frameRemainder

> **frameRemainder**: `Buffer`
