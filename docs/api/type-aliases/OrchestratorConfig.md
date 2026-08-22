[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OrchestratorConfig

# Type Alias: OrchestratorConfig

> **OrchestratorConfig** = `object`

Defined in: [types/agentNetwork.ts:1502](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L1502)

Orchestrator configuration

## Properties

### defaultMode?

> `optional` **defaultMode?**: [`OrchestrationMode`](OrchestrationMode.md)

Defined in: [types/agentNetwork.ts:1504](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L1504)

Default orchestration mode

---

### maxConcurrentExecutions?

> `optional` **maxConcurrentExecutions?**: `number`

Defined in: [types/agentNetwork.ts:1507](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L1507)

Maximum concurrent network executions

---

### defaultTimeout?

> `optional` **defaultTimeout?**: `number`

Defined in: [types/agentNetwork.ts:1510](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L1510)

Default execution timeout

---

### enableHierarchy?

> `optional` **enableHierarchy?**: `boolean`

Defined in: [types/agentNetwork.ts:1513](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L1513)

Enable hierarchical networks

---

### maxHierarchyDepth?

> `optional` **maxHierarchyDepth?**: `number`

Defined in: [types/agentNetwork.ts:1516](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L1516)

Maximum hierarchy depth

---

### enableSharedMessageBus?

> `optional` **enableSharedMessageBus?**: `boolean`

Defined in: [types/agentNetwork.ts:1519](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L1519)

Enable shared message bus

---

### resourceLimits?

> `optional` **resourceLimits?**: `object`

Defined in: [types/agentNetwork.ts:1522](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L1522)

Resource limits

#### maxNetworks?

> `optional` **maxNetworks?**: `number`

#### maxAgentsPerNetwork?

> `optional` **maxAgentsPerNetwork?**: `number`

#### maxTotalAgents?

> `optional` **maxTotalAgents?**: `number`
