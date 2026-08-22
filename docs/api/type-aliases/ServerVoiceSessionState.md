[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerVoiceSessionState

# Type Alias: ServerVoiceSessionState

> **ServerVoiceSessionState** = `object`

Defined in: [types/server.ts:1517](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/server.ts#L1517)

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

Defined in: [types/server.ts:1518](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/server.ts#L1518)

---

### FRAME_LENGTH

> **FRAME_LENGTH**: `number`

Defined in: [types/server.ts:1519](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/server.ts#L1519)

---

### FRAME_BYTES

> **FRAME_BYTES**: `number`

Defined in: [types/server.ts:1520](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/server.ts#L1520)

---

### bus

> **bus**: `FrameBus`

Defined in: [types/server.ts:1521](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/server.ts#L1521)

---

### turnManager

> **turnManager**: `TurnManager`

Defined in: [types/server.ts:1522](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/server.ts#L1522)

---

### sonioxWs

> **sonioxWs**: `WebSocket` \| `null`

Defined in: [types/server.ts:1523](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/server.ts#L1523)

---

### keepAliveTimer

> **keepAliveTimer**: `NodeJS.Timeout` \| `null`

Defined in: [types/server.ts:1524](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/server.ts#L1524)

---

### sonioxReconnectTimer

> **sonioxReconnectTimer**: `ReturnType`\<_typeof_ `setTimeout`\> \| `null`

Defined in: [types/server.ts:1525](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/server.ts#L1525)

---

### sessionClosed

> **sessionClosed**: `boolean`

Defined in: [types/server.ts:1526](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/server.ts#L1526)

---

### transcriptBuffer

> **transcriptBuffer**: `string`

Defined in: [types/server.ts:1527](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/server.ts#L1527)

---

### activeTTS

> **activeTTS**: `CartesiaStream` \| `null`

Defined in: [types/server.ts:1528](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/server.ts#L1528)

---

### conversation

> **conversation**: [`ConversationMessage`](ConversationMessage.md)[]

Defined in: [types/server.ts:1529](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/server.ts#L1529)

---

### currentTurnId

> **currentTurnId**: `number`

Defined in: [types/server.ts:1530](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/server.ts#L1530)

---

### activePipelineTurnId

> **activePipelineTurnId**: `number` \| `null`

Defined in: [types/server.ts:1531](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/server.ts#L1531)

---

### turnAborters

> **turnAborters**: `Set`\<\{ `aborted`: `boolean`; \}\>

Defined in: [types/server.ts:1532](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/server.ts#L1532)

---

### playbackResetTimer

> **playbackResetTimer**: `NodeJS.Timeout` \| `null`

Defined in: [types/server.ts:1533](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/server.ts#L1533)

---

### bargeInLockedUntil

> **bargeInLockedUntil**: `number`

Defined in: [types/server.ts:1534](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/server.ts#L1534)

---

### isSpeaking

> **isSpeaking**: `boolean`

Defined in: [types/server.ts:1535](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/server.ts#L1535)

---

### silenceFrameCount

> **silenceFrameCount**: `number`

Defined in: [types/server.ts:1536](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/server.ts#L1536)

---

### voiceFrameCount

> **voiceFrameCount**: `number`

Defined in: [types/server.ts:1537](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/server.ts#L1537)

---

### frameRemainder

> **frameRemainder**: `Buffer`

Defined in: [types/server.ts:1538](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/server.ts#L1538)
