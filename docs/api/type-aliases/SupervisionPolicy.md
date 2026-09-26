[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SupervisionPolicy

# Type Alias: SupervisionPolicy

> **SupervisionPolicy** = `object`

Supervision policy configuration

## Properties

### reviewThreshold

> **reviewThreshold**: `number`

Confidence below which to review

---

### escalationThreshold

> **escalationThreshold**: `number`

Severity above which to escalate

---

### maxRetries

> **maxRetries**: `number`

Maximum retries before escalation

---

### requireApprovalFor

> **requireApprovalFor**: `string`[]

Tool names requiring approval
