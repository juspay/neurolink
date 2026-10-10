[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveKitMemoryNeuroLink

# Type Alias: LiveKitMemoryNeuroLink

> **LiveKitMemoryNeuroLink** = `object`

The part of a NeuroLink instance a voice agent needs to persist and seed a
call's turns. The real `NeuroLink` instance satisfies it.

## Properties

### recordConversationTurn

> **recordConversationTurn**: (`options`) => `Promise`\<[`RecordConversationTurnResult`](RecordConversationTurnResult.md)\>

#### Parameters

##### options

[`RecordConversationTurnOptions`](RecordConversationTurnOptions.md)

#### Returns

`Promise`\<[`RecordConversationTurnResult`](RecordConversationTurnResult.md)\>

---

### getConversationSeed?

> `optional` **getConversationSeed?**: (`options`) => `Promise`\<[`ConversationSeedMessage`](ConversationSeedMessage.md)[]\>

#### Parameters

##### options

[`ConversationSeedOptions`](ConversationSeedOptions.md)

#### Returns

`Promise`\<[`ConversationSeedMessage`](ConversationSeedMessage.md)[]\>
