[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgentDefinition

# Type Alias: AgentDefinition

> **AgentDefinition** = `object`

Agent definition for creating agents in the network

## Properties

### id

> **id**: `string`

Unique identifier for the agent

---

### name

> **name**: `string`

Human-readable name

---

### description

> **description**: `string`

Description of the agent's capabilities (critical for routing)

---

### instructions

> **instructions**: `string`

System instructions for the agent

---

### provider?

> `optional` **provider?**: [`AIProviderName`](../enumerations/AIProviderName.md) \| `string`

Provider to use for this agent

---

### model?

> `optional` **model?**: `string`

Model to use for this agent

---

### tools?

> `optional` **tools?**: `string`[]

Tools available to this agent (tool names)

---

### inputSchema?

> `optional` **inputSchema?**: `z.ZodSchema`

Input schema for structured agent input

---

### outputSchema?

> `optional` **outputSchema?**: `z.ZodSchema`

Output schema for structured agent output

---

### maxSteps?

> `optional` **maxSteps?**: `number`

Maximum number of steps this agent can take (default: 10)

---

### temperature?

> `optional` **temperature?**: `number`

Temperature for generation (default: 0.7)

---

### canDelegate?

> `optional` **canDelegate?**: `boolean`

Whether this agent can delegate to other agents (default: false)

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Custom metadata for routing decisions

---

### credentials?

> `optional` **credentials?**: `Record`\<`string`, `unknown`\>

Per-agent credentials override
