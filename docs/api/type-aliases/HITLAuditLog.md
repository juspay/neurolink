[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / HITLAuditLog

# Type Alias: HITLAuditLog

> **HITLAuditLog** = `object`

Defined in: [types/hitl.ts:202](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/hitl.ts#L202)

HITL audit log entry
Used for compliance and debugging purposes

## Properties

### timestamp

> **timestamp**: `string`

Defined in: [types/hitl.ts:204](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/hitl.ts#L204)

ISO timestamp of the event

---

### eventType

> **eventType**: `"confirmation-requested"` \| `"confirmation-approved"` \| `"confirmation-rejected"` \| `"confirmation-timeout"` \| `"confirmation-auto-approved"`

Defined in: [types/hitl.ts:207](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/hitl.ts#L207)

Type of HITL event

---

### toolName

> **toolName**: `string`

Defined in: [types/hitl.ts:215](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/hitl.ts#L215)

Tool that was involved

---

### userId?

> `optional` **userId?**: `string`

Defined in: [types/hitl.ts:218](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/hitl.ts#L218)

User who made the decision (if applicable)

---

### sessionId?

> `optional` **sessionId?**: `string`

Defined in: [types/hitl.ts:221](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/hitl.ts#L221)

Session identifier

---

### arguments

> **arguments**: `unknown`

Defined in: [types/hitl.ts:224](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/hitl.ts#L224)

Tool arguments (may be sanitized for security)

---

### reason?

> `optional` **reason?**: `string`

Defined in: [types/hitl.ts:227](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/hitl.ts#L227)

Reason for rejection (if applicable)

---

### ipAddress?

> `optional` **ipAddress?**: `string`

Defined in: [types/hitl.ts:230](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/hitl.ts#L230)

IP address of the user (if available)

---

### userAgent?

> `optional` **userAgent?**: `string`

Defined in: [types/hitl.ts:233](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/hitl.ts#L233)

User agent string (if available)

---

### responseTime?

> `optional` **responseTime?**: `number`

Defined in: [types/hitl.ts:236](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/hitl.ts#L236)

Response time in milliseconds (if applicable)
