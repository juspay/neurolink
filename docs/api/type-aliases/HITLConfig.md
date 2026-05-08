[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / HITLConfig

# Type Alias: HITLConfig

> **HITLConfig** = `object`

Defined in: [types/hitl.ts:13](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/hitl.ts#L13)

Core HITL configuration interface
Controls how the HITL system behaves and what tools require confirmation

## Properties

### enabled

> **enabled**: `boolean`

Defined in: [types/hitl.ts:15](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/hitl.ts#L15)

Master enable/disable switch for HITL functionality

---

### dangerousActions

> **dangerousActions**: `string`[]

Defined in: [types/hitl.ts:18](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/hitl.ts#L18)

Keywords that trigger HITL confirmation (e.g., "delete", "remove", "drop")

---

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/hitl.ts:21](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/hitl.ts#L21)

Timeout in milliseconds for user confirmation (default: 30000)

---

### confirmationMethod?

> `optional` **confirmationMethod?**: `"event"`

Defined in: [types/hitl.ts:24](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/hitl.ts#L24)

Communication method - currently only "event" is supported (default: "event")

---

### allowArgumentModification?

> `optional` **allowArgumentModification?**: `boolean`

Defined in: [types/hitl.ts:27](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/hitl.ts#L27)

Whether users can modify tool arguments during approval (default: true)

---

### autoApproveOnTimeout?

> `optional` **autoApproveOnTimeout?**: `boolean`

Defined in: [types/hitl.ts:30](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/hitl.ts#L30)

Auto-approve requests when they timeout (default: false - rejects on timeout)

---

### auditLogging?

> `optional` **auditLogging?**: `boolean`

Defined in: [types/hitl.ts:33](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/hitl.ts#L33)

Enable audit logging for compliance and debugging (default: false)

---

### customRules?

> `optional` **customRules?**: [`HITLRule`](HITLRule.md)[]

Defined in: [types/hitl.ts:36](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/hitl.ts#L36)

Advanced custom rules for complex tool scenarios (default: [])
