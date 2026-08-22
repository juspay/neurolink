[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgentDefinition

# Type Alias: AgentDefinition

> **AgentDefinition** = `object`

Defined in: [types/agentNetwork.ts:20](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L20)

Agent definition for creating agents in the network

## Properties

### id

> **id**: `string`

Defined in: [types/agentNetwork.ts:22](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L22)

Unique identifier for the agent

---

### name

> **name**: `string`

Defined in: [types/agentNetwork.ts:25](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L25)

Human-readable name

---

### description

> **description**: `string`

Defined in: [types/agentNetwork.ts:28](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L28)

Description of the agent's capabilities (critical for routing)

---

### instructions

> **instructions**: `string`

Defined in: [types/agentNetwork.ts:31](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L31)

System instructions for the agent

---

### provider?

> `optional` **provider?**: [`AIProviderName`](../enumerations/AIProviderName.md) \| `string`

Defined in: [types/agentNetwork.ts:34](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L34)

Provider to use for this agent

---

### model?

> `optional` **model?**: `string`

Defined in: [types/agentNetwork.ts:37](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L37)

Model to use for this agent

---

### tools?

> `optional` **tools?**: `string`[]

Defined in: [types/agentNetwork.ts:40](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L40)

Tools available to this agent (tool names)

---

### inputSchema?

> `optional` **inputSchema?**: `z.ZodSchema`

Defined in: [types/agentNetwork.ts:43](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L43)

Input schema for structured agent input

---

### outputSchema?

> `optional` **outputSchema?**: `z.ZodSchema`

Defined in: [types/agentNetwork.ts:46](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L46)

Output schema for structured agent output

---

### maxSteps?

> `optional` **maxSteps?**: `number`

Defined in: [types/agentNetwork.ts:49](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L49)

Maximum number of steps this agent can take (default: 10)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/agentNetwork.ts:52](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L52)

Temperature for generation (default: 0.7)

---

### canDelegate?

> `optional` **canDelegate?**: `boolean`

Defined in: [types/agentNetwork.ts:55](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L55)

Whether this agent can delegate to other agents (default: false)

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/agentNetwork.ts:58](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L58)

Custom metadata for routing decisions

---

### credentials?

> `optional` **credentials?**: `Record`\<`string`, `unknown`\>

Defined in: [types/agentNetwork.ts:61](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L61)

Per-agent credentials override
