[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareLease

# Type Alias: ProxyShareLease

> **ProxyShareLease** = `object`

Defined in: [types/proxy.ts:4015](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4015)

The offline-survivable projection of a grant.

A complete-mode borrower holds a credential on the lender's account and calls
the upstream directly, so the lender's gate is not in the request path. The
lease is what control looks like without that gate: the borrower enforces it
locally, refreshes it by heartbeat, and stops when it can no longer prove the
lender still consents.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4016](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4016)

---

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4017](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4017)

---

### peerLabel

> **peerLabel**: `string`

Defined in: [types/proxy.ts:4018](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4018)

---

### issuedAt

> **issuedAt**: `number`

Defined in: [types/proxy.ts:4019](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4019)

---

### notAfter

> **notAfter**: `number`

Defined in: [types/proxy.ts:4021](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4021)

Hard stop, honored even by a borrower that never calls home again.

---

### heartbeatEveryMs

> **heartbeatEveryMs**: `number`

Defined in: [types/proxy.ts:4023](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4023)

How often the borrower should check in.

---

### offlineGraceMs

> **offlineGraceMs**: `number`

Defined in: [types/proxy.ts:4025](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4025)

How long the borrower may keep serving while the lender is unreachable.

---

### gates

> **gates**: [`ProxyShareGates`](ProxyShareGates.md)

Defined in: [types/proxy.ts:4027](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4027)

The gate set, snapshotted at issue time.

---

### entitlementSnapshot

> **entitlementSnapshot**: `number` \| `"unlimited"`

Defined in: [types/proxy.ts:4029](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4029)

Coin balance at issue time; "unlimited" for an uncapped grant.

---

### signature

> **signature**: `string`

Defined in: [types/proxy.ts:4031](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4031)

HMAC over the payload, keyed by the grant's lease secret.
