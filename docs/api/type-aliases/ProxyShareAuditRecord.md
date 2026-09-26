[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareAuditRecord

# Type Alias: ProxyShareAuditRecord

> **ProxyShareAuditRecord** = `object`

Rolling audit state for one complete-mode grant.

## Properties

### grantId

> **grantId**: `string`

---

### accountLabel

> **accountLabel**: `string`

The lender's own account the credential was provisioned from.

---

### lastObservation?

> `optional` **lastObservation?**: [`ProxyShareAuditObservation`](ProxyShareAuditObservation.md)

---

### lenderRequestsTotal?

> `optional` **lenderRequestsTotal?**: `number`

Running lifetime total of lender-served requests on the account, kept so
the next observation's delta can be computed.

---

### driftStreak

> **driftStreak**: `number`

Consecutive heartbeats where the account moved but nothing was reported.

---

### lastDriftAt?

> `optional` **lastDriftAt?**: `number`

---

### lastDriftDetail?

> `optional` **lastDriftDetail?**: `string`

---

### autoPausedAt?

> `optional` **autoPausedAt?**: `number`

Set once the streak crossed the tolerance and the grant was paused.
