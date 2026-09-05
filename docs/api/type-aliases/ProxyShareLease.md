[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareLease

# Type Alias: ProxyShareLease

> **ProxyShareLease** = `object`

Defined in: [types/proxy.ts:4136](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4136)

The offline-survivable projection of a grant.

A complete-mode borrower holds a credential on the lender's account and calls
the upstream directly, so the lender's gate is not in the request path. The
lease is what control looks like without that gate: the borrower enforces it
locally, refreshes it by heartbeat, and stops when it can no longer prove the
lender still consents.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4137](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4137)

---

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4138](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4138)

---

### peerLabel

> **peerLabel**: `string`

Defined in: [types/proxy.ts:4139](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4139)

---

### issuedAt

> **issuedAt**: `number`

Defined in: [types/proxy.ts:4140](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4140)

---

### notAfter

> **notAfter**: `number`

Defined in: [types/proxy.ts:4142](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4142)

Hard stop, honored even by a borrower that never calls home again.

---

### heartbeatEveryMs

> **heartbeatEveryMs**: `number`

Defined in: [types/proxy.ts:4144](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4144)

How often the borrower should check in.

---

### offlineGraceMs

> **offlineGraceMs**: `number`

Defined in: [types/proxy.ts:4146](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4146)

How long the borrower may keep serving while the lender is unreachable.

---

### gates

> **gates**: [`ProxyShareGates`](ProxyShareGates.md)

Defined in: [types/proxy.ts:4148](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4148)

The gate set, snapshotted at issue time.

---

### entitlementSnapshot

> **entitlementSnapshot**: `number` \| `"unlimited"`

Defined in: [types/proxy.ts:4150](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4150)

Coin balance at issue time; "unlimited" for an uncapped grant.

---

### signature

> **signature**: `string`

Defined in: [types/proxy.ts:4152](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4152)

HMAC over the payload, keyed by the grant's lease secret.
