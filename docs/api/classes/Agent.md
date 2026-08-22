[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / Agent

# Class: Agent

Defined in: [agent/agent.ts:49](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/agent.ts#L49)

Agent - Wraps a NeuroLink instance with specialized behavior

Features:

- Custom instructions and persona
- Tool restrictions per agent (via toolFilter on generate/stream)
- Input/output schema validation
- Streaming support
- Execution metrics tracking

## Example

```typescript
const agent = new Agent(
  {
    id: "researcher",
    name: "Research Agent",
    description: "Searches and analyzes information",
    instructions: "You are a research assistant...",
    tools: ["websearchGrounding", "readFile"],
  },
  neurolink,
);

const result = await agent.execute("Find information about quantum computing");
```

## Implements

- [`AgentInstance`](../type-aliases/AgentInstance.md)

## Constructors

### Constructor

> **new Agent**(`definition`, `neurolink`): `Agent`

Defined in: [agent/agent.ts:70](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/agent.ts#L70)

#### Parameters

##### definition

[`AgentDefinition`](../type-aliases/AgentDefinition.md)

##### neurolink

[`NeuroLink`](NeuroLink.md)

#### Returns

`Agent`

## Properties

### id

> `readonly` **id**: `string`

Defined in: [agent/agent.ts:50](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/agent.ts#L50)

Agent ID

#### Implementation of

`AgentInstance.id`

---

### name

> `readonly` **name**: `string`

Defined in: [agent/agent.ts:51](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/agent.ts#L51)

Agent name

#### Implementation of

`AgentInstance.name`

---

### description

> `readonly` **description**: `string`

Defined in: [agent/agent.ts:52](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/agent.ts#L52)

Agent description

#### Implementation of

`AgentInstance.description`

---

### instructions

> `readonly` **instructions**: `string`

Defined in: [agent/agent.ts:53](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/agent.ts#L53)

Agent instructions

#### Implementation of

`AgentInstance.instructions`

---

### provider?

> `readonly` `optional` **provider?**: `string`

Defined in: [agent/agent.ts:54](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/agent.ts#L54)

---

### model?

> `readonly` `optional` **model?**: `string`

Defined in: [agent/agent.ts:55](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/agent.ts#L55)

---

### tools?

> `readonly` `optional` **tools?**: `string`[]

Defined in: [agent/agent.ts:56](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/agent.ts#L56)

---

### inputSchema?

> `readonly` `optional` **inputSchema?**: `ZodType`\<`unknown`, `unknown`, `$ZodTypeInternals`\<`unknown`, `unknown`\>\>

Defined in: [agent/agent.ts:57](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/agent.ts#L57)

---

### outputSchema?

> `readonly` `optional` **outputSchema?**: `ZodType`\<`unknown`, `unknown`, `$ZodTypeInternals`\<`unknown`, `unknown`\>\>

Defined in: [agent/agent.ts:58](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/agent.ts#L58)

---

### maxSteps

> `readonly` **maxSteps**: `number`

Defined in: [agent/agent.ts:59](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/agent.ts#L59)

---

### temperature

> `readonly` **temperature**: `number`

Defined in: [agent/agent.ts:60](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/agent.ts#L60)

---

### canDelegate

> `readonly` **canDelegate**: `boolean`

Defined in: [agent/agent.ts:61](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/agent.ts#L61)

---

### metadata?

> `readonly` `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [agent/agent.ts:62](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/agent.ts#L62)

## Methods

### execute()

> **execute**(`input`, `options?`): `Promise`\<[`AgentResult`](../type-aliases/AgentResult.md)\>

Defined in: [agent/agent.ts:131](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/agent.ts#L131)

Execute the agent with given input

#### Parameters

##### input

[`AgentInput`](../type-aliases/AgentInput.md)

Text input or structured data

##### options?

[`AgentExecutionOptions`](../type-aliases/AgentExecutionOptions.md)

Execution options

#### Returns

`Promise`\<[`AgentResult`](../type-aliases/AgentResult.md)\>

Agent result with content and metadata

#### Implementation of

`AgentInstance.execute`

---

### stream()

> **stream**(`input`, `options?`): `AsyncIterable`\<[`AgentStreamChunk`](../type-aliases/AgentStreamChunk.md)\>

Defined in: [agent/agent.ts:269](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/agent.ts#L269)

Stream execution results

#### Parameters

##### input

[`AgentInput`](../type-aliases/AgentInput.md)

Text input or structured data

##### options?

[`AgentExecutionOptions`](../type-aliases/AgentExecutionOptions.md)

Execution options

#### Returns

`AsyncIterable`\<[`AgentStreamChunk`](../type-aliases/AgentStreamChunk.md)\>

#### Yields

Agent stream chunks

#### Implementation of

`AgentInstance.stream`

---

### getStatus()

> **getStatus**(): [`AgentStatus`](../type-aliases/AgentStatus.md)

Defined in: [agent/agent.ts:409](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/agent.ts#L409)

Get agent status

#### Returns

[`AgentStatus`](../type-aliases/AgentStatus.md)

#### Implementation of

`AgentInstance.getStatus`

---

### getAverageExecutionTime()

> **getAverageExecutionTime**(): `number`

Defined in: [agent/agent.ts:422](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/agent.ts#L422)

Get average execution time

#### Returns

`number`

---

### on()

> **on**(`event`, `handler`): `void`

Defined in: [agent/agent.ts:432](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/agent.ts#L432)

Subscribe to agent events

#### Parameters

##### event

`string`

##### handler

(...`args`) => `void`

#### Returns

`void`

---

### off()

> **off**(`event`, `handler`): `void`

Defined in: [agent/agent.ts:439](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/agent.ts#L439)

Unsubscribe from agent events

#### Parameters

##### event

`string`

##### handler

(...`args`) => `void`

#### Returns

`void`
