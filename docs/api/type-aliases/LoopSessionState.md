[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / LoopSessionState

# Type Alias: LoopSessionState

> **LoopSessionState** = `object`

Defined in: [types/common.ts:595](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/common.ts#L595)

State snapshot for the active REPL loop session.

## Properties

### neurolinkInstance

> **neurolinkInstance**: [`NeuroLink`](../classes/NeuroLink.md)

Defined in: [types/common.ts:596](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/common.ts#L596)

---

### sessionId

> **sessionId**: `string`

Defined in: [types/common.ts:597](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/common.ts#L597)

---

### isActive

> **isActive**: `boolean`

Defined in: [types/common.ts:598](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/common.ts#L598)

---

### conversationMemoryConfig?

> `optional` **conversationMemoryConfig?**: [`ConversationMemoryConfig`](ConversationMemoryConfig.md)

Defined in: [types/common.ts:599](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/common.ts#L599)

---

### sessionVariables

> **sessionVariables**: `Record`\<`string`, [`SessionVariableValue`](SessionVariableValue.md)\>

Defined in: [types/common.ts:600](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/common.ts#L600)
