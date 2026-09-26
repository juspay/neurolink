[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareLease

# Type Alias: ProxyShareLease

> **ProxyShareLease** = `object`

The offline-survivable projection of a grant.

A complete-mode borrower holds a credential on the lender's account and calls
the upstream directly, so the lender's gate is not in the request path. The
lease is what control looks like without that gate: the borrower enforces it
locally, refreshes it by heartbeat, and stops when it can no longer prove the
lender still consents.

## Properties

### schemaVersion

> **schemaVersion**: `1`

---

### grantId

> **grantId**: `string`

---

### peerLabel

> **peerLabel**: `string`

---

### issuedAt

> **issuedAt**: `number`

---

### notAfter

> **notAfter**: `number`

Hard stop, honored even by a borrower that never calls home again.

---

### heartbeatEveryMs

> **heartbeatEveryMs**: `number`

How often the borrower should check in.

---

### offlineGraceMs

> **offlineGraceMs**: `number`

How long the borrower may keep serving while the lender is unreachable.

---

### gates

> **gates**: [`ProxyShareGates`](ProxyShareGates.md)

The gate set, snapshotted at issue time.

---

### entitlementSnapshot

> **entitlementSnapshot**: `number` \| `"unlimited"`

Coin balance at issue time; "unlimited" for an uncapped grant.

---

### signature

> **signature**: `string`

HMAC over the payload, keyed by the grant's lease secret.
