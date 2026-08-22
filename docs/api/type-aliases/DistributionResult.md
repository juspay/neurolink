[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / DistributionResult

# Type Alias: DistributionResult

> **DistributionResult** = `object`

Defined in: [types/agentNetwork.ts:1386](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L1386)

Result of task distribution

## Properties

### taskId

> **taskId**: `string`

Defined in: [types/agentNetwork.ts:1388](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L1388)

Task ID

---

### agentId

> **agentId**: `string`

Defined in: [types/agentNetwork.ts:1391](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L1391)

Assigned agent ID

---

### result?

> `optional` **result?**: [`AgentResult`](AgentResult.md)

Defined in: [types/agentNetwork.ts:1394](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L1394)

Execution result

---

### distributedAt

> **distributedAt**: `number`

Defined in: [types/agentNetwork.ts:1397](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L1397)

Distribution timestamp

---

### completedAt?

> `optional` **completedAt?**: `number`

Defined in: [types/agentNetwork.ts:1400](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L1400)

Completion timestamp

---

### status

> **status**: `"pending"` \| `"running"` \| `"completed"` \| `"failed"`

Defined in: [types/agentNetwork.ts:1403](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L1403)

Status

---

### error?

> `optional` **error?**: `string`

Defined in: [types/agentNetwork.ts:1406](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L1406)

Error if failed
