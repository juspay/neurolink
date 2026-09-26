[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / HITLAuditLog

# Type Alias: HITLAuditLog

> **HITLAuditLog** = `object`

HITL audit log entry
Used for compliance and debugging purposes

## Properties

### timestamp

> **timestamp**: `string`

ISO timestamp of the event

---

### eventType

> **eventType**: `"confirmation-requested"` \| `"confirmation-approved"` \| `"confirmation-rejected"` \| `"confirmation-timeout"` \| `"confirmation-auto-approved"`

Type of HITL event

---

### toolName

> **toolName**: `string`

Tool that was involved

---

### userId?

> `optional` **userId?**: `string`

User who made the decision (if applicable)

---

### sessionId?

> `optional` **sessionId?**: `string`

Session identifier

---

### arguments

> **arguments**: `unknown`

Tool arguments (may be sanitized for security)

---

### reason?

> `optional` **reason?**: `string`

Reason for rejection (if applicable)

---

### ipAddress?

> `optional` **ipAddress?**: `string`

IP address of the user (if available)

---

### userAgent?

> `optional` **userAgent?**: `string`

User agent string (if available)

---

### responseTime?

> `optional` **responseTime?**: `number`

Response time in milliseconds (if applicable)
