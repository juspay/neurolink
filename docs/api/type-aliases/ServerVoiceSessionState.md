[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerVoiceSessionState

# Type Alias: ServerVoiceSessionState

> **ServerVoiceSessionState** = `object`

Defined in: [types/server.ts:1507](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L1507)

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

Defined in: [types/server.ts:1508](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L1508)

---

### FRAME_LENGTH

> **FRAME_LENGTH**: `number`

Defined in: [types/server.ts:1509](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L1509)

---

### FRAME_BYTES

> **FRAME_BYTES**: `number`

Defined in: [types/server.ts:1510](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L1510)

---

### bus

> **bus**: `FrameBus`

Defined in: [types/server.ts:1511](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L1511)

---

### turnManager

> **turnManager**: `TurnManager`

Defined in: [types/server.ts:1512](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L1512)

---

### sonioxWs

> **sonioxWs**: `WebSocket` \| `null`

Defined in: [types/server.ts:1513](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L1513)

---

### keepAliveTimer

> **keepAliveTimer**: `NodeJS.Timeout` \| `null`

Defined in: [types/server.ts:1514](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L1514)

---

### sonioxReconnectTimer

> **sonioxReconnectTimer**: `ReturnType`\<_typeof_ `setTimeout`\> \| `null`

Defined in: [types/server.ts:1515](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L1515)

---

### sessionClosed

> **sessionClosed**: `boolean`

Defined in: [types/server.ts:1516](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L1516)

---

### transcriptBuffer

> **transcriptBuffer**: `string`

Defined in: [types/server.ts:1517](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L1517)

---

### activeTTS

> **activeTTS**: `CartesiaStream` \| `null`

Defined in: [types/server.ts:1518](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L1518)

---

### conversation

> **conversation**: [`ConversationMessage`](ConversationMessage.md)[]

Defined in: [types/server.ts:1519](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L1519)

---

### currentTurnId

> **currentTurnId**: `number`

Defined in: [types/server.ts:1520](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L1520)

---

### activePipelineTurnId

> **activePipelineTurnId**: `number` \| `null`

Defined in: [types/server.ts:1521](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L1521)

---

### turnAborters

> **turnAborters**: `Set`\<\{ `aborted`: `boolean`; \}\>

Defined in: [types/server.ts:1522](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L1522)

---

### playbackResetTimer

> **playbackResetTimer**: `NodeJS.Timeout` \| `null`

Defined in: [types/server.ts:1523](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L1523)

---

### bargeInLockedUntil

> **bargeInLockedUntil**: `number`

Defined in: [types/server.ts:1524](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L1524)

---

### isSpeaking

> **isSpeaking**: `boolean`

Defined in: [types/server.ts:1525](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L1525)

---

### silenceFrameCount

> **silenceFrameCount**: `number`

Defined in: [types/server.ts:1526](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L1526)

---

### voiceFrameCount

> **voiceFrameCount**: `number`

Defined in: [types/server.ts:1527](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L1527)

---

### frameRemainder

> **frameRemainder**: `Buffer`

Defined in: [types/server.ts:1528](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L1528)
