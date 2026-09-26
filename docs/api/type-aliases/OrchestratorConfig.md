[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OrchestratorConfig

# Type Alias: OrchestratorConfig

> **OrchestratorConfig** = `object`

Orchestrator configuration

## Properties

### defaultMode?

> `optional` **defaultMode?**: [`OrchestrationMode`](OrchestrationMode.md)

Default orchestration mode

---

### maxConcurrentExecutions?

> `optional` **maxConcurrentExecutions?**: `number`

Maximum concurrent network executions

---

### defaultTimeout?

> `optional` **defaultTimeout?**: `number`

Default execution timeout

---

### enableHierarchy?

> `optional` **enableHierarchy?**: `boolean`

Enable hierarchical networks

---

### maxHierarchyDepth?

> `optional` **maxHierarchyDepth?**: `number`

Maximum hierarchy depth

---

### enableSharedMessageBus?

> `optional` **enableSharedMessageBus?**: `boolean`

Enable shared message bus

---

### resourceLimits?

> `optional` **resourceLimits?**: `object`

Resource limits

#### maxNetworks?

> `optional` **maxNetworks?**: `number`

#### maxAgentsPerNetwork?

> `optional` **maxAgentsPerNetwork?**: `number`

#### maxTotalAgents?

> `optional` **maxTotalAgents?**: `number`
