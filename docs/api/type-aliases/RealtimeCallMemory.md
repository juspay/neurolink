[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RealtimeCallMemory

# Type Alias: RealtimeCallMemory

> **RealtimeCallMemory** = `object`

What a realtime call needs from its memory once its binding verified.

## Properties

### recorder

> **recorder**: [`VoiceTurnRecorder`](VoiceTurnRecorder.md)

---

### seed

> **seed**: [`ConversationSeedMessage`](ConversationSeedMessage.md)[]

Recent history to seed the model with; empty when there is none or seeding is off.

---

### setPublisher

> **setPublisher**: (`publish`) => `void`

Late-bound publisher, set once the event bridge exists, for the not-saved notice.

#### Parameters

##### publish

(`type`, `data`) => `void`

#### Returns

`void`
