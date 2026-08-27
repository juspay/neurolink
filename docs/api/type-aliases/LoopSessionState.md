[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LoopSessionState

# Type Alias: LoopSessionState

> **LoopSessionState** = `object`

Defined in: [types/common.ts:715](https://github.com/juspay/neurolink/blob/release/src/lib/types/common.ts#L715)

State snapshot for the active REPL loop session.

## Properties

### neurolinkInstance

> **neurolinkInstance**: [`NeuroLink`](../classes/NeuroLink.md)

Defined in: [types/common.ts:716](https://github.com/juspay/neurolink/blob/release/src/lib/types/common.ts#L716)

---

### sessionId

> **sessionId**: `string`

Defined in: [types/common.ts:717](https://github.com/juspay/neurolink/blob/release/src/lib/types/common.ts#L717)

---

### isActive

> **isActive**: `boolean`

Defined in: [types/common.ts:718](https://github.com/juspay/neurolink/blob/release/src/lib/types/common.ts#L718)

---

### conversationMemoryConfig?

> `optional` **conversationMemoryConfig?**: [`ConversationMemoryConfig`](ConversationMemoryConfig.md)

Defined in: [types/common.ts:719](https://github.com/juspay/neurolink/blob/release/src/lib/types/common.ts#L719)

---

### sessionVariables

> **sessionVariables**: `Record`\<`string`, [`SessionVariableValue`](SessionVariableValue.md)\>

Defined in: [types/common.ts:720](https://github.com/juspay/neurolink/blob/release/src/lib/types/common.ts#L720)
