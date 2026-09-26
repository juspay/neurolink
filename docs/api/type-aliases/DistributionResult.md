[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DistributionResult

# Type Alias: DistributionResult

> **DistributionResult** = `object`

Result of task distribution

## Properties

### taskId

> **taskId**: `string`

Task ID

---

### agentId

> **agentId**: `string`

Assigned agent ID

---

### result?

> `optional` **result?**: [`AgentResult`](AgentResult.md)

Execution result

---

### distributedAt

> **distributedAt**: `number`

Distribution timestamp

---

### completedAt?

> `optional` **completedAt?**: `number`

Completion timestamp

---

### status

> **status**: `"pending"` \| `"running"` \| `"completed"` \| `"failed"`

Status

---

### error?

> `optional` **error?**: `string`

Error if failed
