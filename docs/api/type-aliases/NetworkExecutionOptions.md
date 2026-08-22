[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / NetworkExecutionOptions

# Type Alias: NetworkExecutionOptions

> **NetworkExecutionOptions** = `object`

Defined in: [types/agentNetwork.ts:402](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L402)

Options for network execution

## Properties

### maxSteps?

> `optional` **maxSteps?**: `number`

Defined in: [types/agentNetwork.ts:404](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L404)

Maximum execution steps across the network

---

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/agentNetwork.ts:407](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L407)

Timeout in milliseconds

---

### stream?

> `optional` **stream?**: `boolean`

Defined in: [types/agentNetwork.ts:410](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L410)

Enable streaming

---

### context?

> `optional` **context?**: `Record`\<`string`, `unknown`\>

Defined in: [types/agentNetwork.ts:413](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L413)

Additional context

---

### tracing?

> `optional` **tracing?**: `object`

Defined in: [types/agentNetwork.ts:416](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L416)

Tracing configuration

#### enabled?

> `optional` **enabled?**: `boolean`

#### traceId?

> `optional` **traceId?**: `string`

#### parentSpanId?

> `optional` **parentSpanId?**: `string`

---

### modelSettings?

> `optional` **modelSettings?**: `object`

Defined in: [types/agentNetwork.ts:423](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L423)

Model settings override

#### temperature?

> `optional` **temperature?**: `number`

#### maxTokens?

> `optional` **maxTokens?**: `number`

#### topP?

> `optional` **topP?**: `number`

---

### outputSchema?

> `optional` **outputSchema?**: `z.ZodSchema`

Defined in: [types/agentNetwork.ts:430](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L430)

Output schema for structured output
