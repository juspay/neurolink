[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / TaskAssignment

# Type Alias: TaskAssignment

> **TaskAssignment** = `object`

Defined in: [types/agentNetwork.ts:1310](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L1310)

Task assignment for an agent

## Properties

### agent

> **agent**: [`AgentInstance`](AgentInstance.md)

Defined in: [types/agentNetwork.ts:1312](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L1312)

Agent to execute

---

### input

> **input**: `string`

Defined in: [types/agentNetwork.ts:1315](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L1315)

Task input

---

### dependencies?

> `optional` **dependencies?**: `string`[]

Defined in: [types/agentNetwork.ts:1318](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L1318)

Dependencies (agent IDs that must complete first)

---

### priority?

> `optional` **priority?**: `number`

Defined in: [types/agentNetwork.ts:1321](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L1321)

Priority (higher = executed first)

---

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/agentNetwork.ts:1324](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L1324)

Timeout override
