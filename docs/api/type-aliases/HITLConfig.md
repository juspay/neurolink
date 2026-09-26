[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / HITLConfig

# Type Alias: HITLConfig

> **HITLConfig** = `object`

Core HITL configuration interface
Controls how the HITL system behaves and what tools require confirmation

## Properties

### enabled

> **enabled**: `boolean`

Master enable/disable switch for HITL functionality

---

### dangerousActions

> **dangerousActions**: `string`[]

Keywords that trigger HITL confirmation (e.g., "delete", "remove", "drop")

---

### timeout?

> `optional` **timeout?**: `number`

Timeout in milliseconds for user confirmation (default: 30000)

---

### confirmationMethod?

> `optional` **confirmationMethod?**: `"event"`

Communication method - currently only "event" is supported (default: "event")

---

### allowArgumentModification?

> `optional` **allowArgumentModification?**: `boolean`

Whether users can modify tool arguments during approval (default: true)

---

### autoApproveOnTimeout?

> `optional` **autoApproveOnTimeout?**: `boolean`

Auto-approve requests when they timeout (default: false - rejects on timeout)

---

### auditLogging?

> `optional` **auditLogging?**: `boolean`

Enable audit logging for compliance and debugging (default: false)

---

### customRules?

> `optional` **customRules?**: [`HITLRule`](HITLRule.md)[]

Advanced custom rules for complex tool scenarios (default: [])
