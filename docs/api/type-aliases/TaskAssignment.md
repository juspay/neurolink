[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TaskAssignment

# Type Alias: TaskAssignment

> **TaskAssignment** = `object`

Task assignment for an agent

## Properties

### agent

> **agent**: [`AgentInstance`](AgentInstance.md)

Agent to execute

---

### input

> **input**: `string`

Task input

---

### dependencies?

> `optional` **dependencies?**: `string`[]

Dependencies (agent IDs that must complete first)

---

### priority?

> `optional` **priority?**: `number`

Priority (higher = executed first)

---

### timeout?

> `optional` **timeout?**: `number`

Timeout override
