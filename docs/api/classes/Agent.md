[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / Agent

# Class: Agent

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

Agent ID

#### Implementation of

`AgentInstance.id`

---

### name

> `readonly` **name**: `string`

Agent name

#### Implementation of

`AgentInstance.name`

---

### description

> `readonly` **description**: `string`

Agent description

#### Implementation of

`AgentInstance.description`

---

### instructions

> `readonly` **instructions**: `string`

Agent instructions

#### Implementation of

`AgentInstance.instructions`

---

### provider?

> `readonly` `optional` **provider?**: `string`

---

### model?

> `readonly` `optional` **model?**: `string`

---

### tools?

> `readonly` `optional` **tools?**: `string`[]

---

### inputSchema?

> `readonly` `optional` **inputSchema?**: `ZodType`\<`unknown`, `unknown`, `$ZodTypeInternals`\<`unknown`, `unknown`\>\>

---

### outputSchema?

> `readonly` `optional` **outputSchema?**: `ZodType`\<`unknown`, `unknown`, `$ZodTypeInternals`\<`unknown`, `unknown`\>\>

---

### maxSteps

> `readonly` **maxSteps**: `number`

---

### temperature

> `readonly` **temperature**: `number`

---

### canDelegate

> `readonly` **canDelegate**: `boolean`

---

### metadata?

> `readonly` `optional` **metadata?**: `Record`\<`string`, `unknown`\>

## Methods

### execute()

> **execute**(`input`, `options?`): `Promise`\<[`AgentResult`](../type-aliases/AgentResult.md)\>

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

Get agent status

#### Returns

[`AgentStatus`](../type-aliases/AgentStatus.md)

#### Implementation of

`AgentInstance.getStatus`

---

### getAverageExecutionTime()

> **getAverageExecutionTime**(): `number`

Get average execution time

#### Returns

`number`

---

### on()

> **on**(`event`, `handler`): `void`

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

Unsubscribe from agent events

#### Parameters

##### event

`string`

##### handler

(...`args`) => `void`

#### Returns

`void`
