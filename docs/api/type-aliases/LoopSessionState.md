[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / LoopSessionState

# Type Alias: LoopSessionState

> **LoopSessionState** = `object`

Defined in: [types/common.ts:627](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/common.ts#L627)

State snapshot for the active REPL loop session.

## Properties

### neurolinkInstance

> **neurolinkInstance**: [`NeuroLink`](../classes/NeuroLink.md)

Defined in: [types/common.ts:628](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/common.ts#L628)

---

### sessionId

> **sessionId**: `string`

Defined in: [types/common.ts:629](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/common.ts#L629)

---

### isActive

> **isActive**: `boolean`

Defined in: [types/common.ts:630](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/common.ts#L630)

---

### conversationMemoryConfig?

> `optional` **conversationMemoryConfig?**: [`ConversationMemoryConfig`](ConversationMemoryConfig.md)

Defined in: [types/common.ts:631](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/common.ts#L631)

---

### sessionVariables

> **sessionVariables**: `Record`\<`string`, [`SessionVariableValue`](SessionVariableValue.md)\>

Defined in: [types/common.ts:632](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/common.ts#L632)
