[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerVoiceSessionState

# Type Alias: ServerVoiceSessionState

> **ServerVoiceSessionState** = `object`

Defined in: [types/server.ts:1504](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1504)

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

Defined in: [types/server.ts:1505](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1505)

---

### FRAME_LENGTH

> **FRAME_LENGTH**: `number`

Defined in: [types/server.ts:1506](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1506)

---

### FRAME_BYTES

> **FRAME_BYTES**: `number`

Defined in: [types/server.ts:1507](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1507)

---

### bus

> **bus**: `FrameBus`

Defined in: [types/server.ts:1508](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1508)

---

### turnManager

> **turnManager**: `TurnManager`

Defined in: [types/server.ts:1509](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1509)

---

### sonioxWs

> **sonioxWs**: `WebSocket` \| `null`

Defined in: [types/server.ts:1510](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1510)

---

### keepAliveTimer

> **keepAliveTimer**: `NodeJS.Timeout` \| `null`

Defined in: [types/server.ts:1511](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1511)

---

### sonioxReconnectTimer

> **sonioxReconnectTimer**: `ReturnType`\<_typeof_ `setTimeout`\> \| `null`

Defined in: [types/server.ts:1512](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1512)

---

### sessionClosed

> **sessionClosed**: `boolean`

Defined in: [types/server.ts:1513](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1513)

---

### transcriptBuffer

> **transcriptBuffer**: `string`

Defined in: [types/server.ts:1514](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1514)

---

### activeTTS

> **activeTTS**: `CartesiaStream` \| `null`

Defined in: [types/server.ts:1515](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1515)

---

### conversation

> **conversation**: [`ConversationMessage`](ConversationMessage.md)[]

Defined in: [types/server.ts:1516](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1516)

---

### currentTurnId

> **currentTurnId**: `number`

Defined in: [types/server.ts:1517](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1517)

---

### activePipelineTurnId

> **activePipelineTurnId**: `number` \| `null`

Defined in: [types/server.ts:1518](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1518)

---

### turnAborters

> **turnAborters**: `Set`\<\{ `aborted`: `boolean`; \}\>

Defined in: [types/server.ts:1519](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1519)

---

### playbackResetTimer

> **playbackResetTimer**: `NodeJS.Timeout` \| `null`

Defined in: [types/server.ts:1520](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1520)

---

### bargeInLockedUntil

> **bargeInLockedUntil**: `number`

Defined in: [types/server.ts:1521](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1521)

---

### isSpeaking

> **isSpeaking**: `boolean`

Defined in: [types/server.ts:1522](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1522)

---

### silenceFrameCount

> **silenceFrameCount**: `number`

Defined in: [types/server.ts:1523](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1523)

---

### voiceFrameCount

> **voiceFrameCount**: `number`

Defined in: [types/server.ts:1524](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1524)

---

### frameRemainder

> **frameRemainder**: `Buffer`

Defined in: [types/server.ts:1525](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1525)
