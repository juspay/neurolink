[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyResidentGrant

# Type Alias: ProxyResidentGrant

> **ProxyResidentGrant** = `object`

A credential provisioned onto a borrower's device under a complete grant.

## Properties

### schemaVersion

> **schemaVersion**: `1`

---

### accountLabel

> **accountLabel**: `string`

Local tokenStore label, unique on the borrower's device.

---

### grantId

> **grantId**: `string`

---

### lenderName

> **lenderName**: `string`

---

### lenderUrl

> **lenderUrl**: `string`

---

### leaseSecret

> **leaseSecret**: `string`

Shared secret used to verify leases from this lender.

---

### lease

> **lease**: [`ProxyShareLease`](ProxyShareLease.md)

---

### lastHeartbeatAt?

> `optional` **lastHeartbeatAt?**: `number`

---

### unreportedCoins?

> `optional` **unreportedCoins?**: `number`

Coins spent since the last successful heartbeat, awaiting report.

---

### unreportedRequests?

> `optional` **unreportedRequests?**: `number`
