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

Advertised to the approval UI as allowModification (default: false); not enforced, a response's modifiedArguments is applied either way

---

### autoApproveOnTimeout?

> `optional` **autoApproveOnTimeout?**: `boolean`

Auto-approve requests when they timeout (default: false - rejects on timeout)

---

### autoApproveExclusions?

> `optional` **autoApproveExclusions?**: `string`[]

Exact tool names that require an explicit answer even when timeout auto-approval is enabled.

---

### auditLogging?

> `optional` **auditLogging?**: `boolean`

Enable audit logging for compliance and debugging (default: false)

---

### customRules?

> `optional` **customRules?**: [`HITLRule`](HITLRule.md)[]

Advanced custom rules for complex tool scenarios (default: [])

---

### confirmBuiltinTools?

> `optional` **confirmBuiltinTools?**: `boolean`

Whether the built-in tools that change the machine — `writeFile` and the
opt-in `executeBashCommand` — always require confirmation while HITL is
enabled, whatever `dangerousActions` says (default: true). Set to `false`
to gate built-in tools by `dangerousActions` keywords and `customRules`
only, as every other tool is.
