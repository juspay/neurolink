[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / RunWorkflowOptions

# Type Alias: RunWorkflowOptions

> **RunWorkflowOptions** = `object`

Defined in: [types/workflow.ts:778](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/workflow.ts#L778)

Options for workflow execution

## Properties

### prompt

> **prompt**: `string`

Defined in: [types/workflow.ts:780](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/workflow.ts#L780)

The user's prompt/query to send to models

---

### conversationHistory?

> `optional` **conversationHistory?**: `object`[]

Defined in: [types/workflow.ts:782](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/workflow.ts#L782)

Optional conversation history for context

#### role

> **role**: `"user"` \| `"assistant"`

#### content

> **content**: `string`

---

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/workflow.ts:784](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/workflow.ts#L784)

Override default timeout (ms) for this execution

---

### parallelism?

> `optional` **parallelism?**: `number`

Defined in: [types/workflow.ts:786](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/workflow.ts#L786)

Override default parallelism for this execution

---

### verbose?

> `optional` **verbose?**: `boolean`

Defined in: [types/workflow.ts:788](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/workflow.ts#L788)

Enable verbose logging for debugging

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

Defined in: [types/workflow.ts:790](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/workflow.ts#L790)

Optional context/metadata to pass through

---

### streaming?

> `optional` **streaming?**: `boolean`

Defined in: [types/workflow.ts:792](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/workflow.ts#L792)

Enable progressive streaming (yield preliminary response)
