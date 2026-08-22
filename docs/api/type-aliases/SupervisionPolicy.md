[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / SupervisionPolicy

# Type Alias: SupervisionPolicy

> **SupervisionPolicy** = `object`

Defined in: [types/agentNetwork.ts:986](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L986)

Supervision policy configuration

## Properties

### reviewThreshold

> **reviewThreshold**: `number`

Defined in: [types/agentNetwork.ts:988](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L988)

Confidence below which to review

---

### escalationThreshold

> **escalationThreshold**: `number`

Defined in: [types/agentNetwork.ts:991](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L991)

Severity above which to escalate

---

### maxRetries

> **maxRetries**: `number`

Defined in: [types/agentNetwork.ts:994](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L994)

Maximum retries before escalation

---

### requireApprovalFor

> **requireApprovalFor**: `string`[]

Defined in: [types/agentNetwork.ts:997](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L997)

Tool names requiring approval
