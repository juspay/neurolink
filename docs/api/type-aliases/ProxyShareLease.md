[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareLease

# Type Alias: ProxyShareLease

> **ProxyShareLease** = `object`

Defined in: [types/proxy.ts:4735](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4735)

The offline-survivable projection of a grant.

A complete-mode borrower holds a credential on the lender's account and calls
the upstream directly, so the lender's gate is not in the request path. The
lease is what control looks like without that gate: the borrower enforces it
locally, refreshes it by heartbeat, and stops when it can no longer prove the
lender still consents.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4736](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4736)

---

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4737](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4737)

---

### peerLabel

> **peerLabel**: `string`

Defined in: [types/proxy.ts:4738](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4738)

---

### issuedAt

> **issuedAt**: `number`

Defined in: [types/proxy.ts:4739](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4739)

---

### notAfter

> **notAfter**: `number`

Defined in: [types/proxy.ts:4741](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4741)

Hard stop, honored even by a borrower that never calls home again.

---

### heartbeatEveryMs

> **heartbeatEveryMs**: `number`

Defined in: [types/proxy.ts:4743](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4743)

How often the borrower should check in.

---

### offlineGraceMs

> **offlineGraceMs**: `number`

Defined in: [types/proxy.ts:4745](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4745)

How long the borrower may keep serving while the lender is unreachable.

---

### gates

> **gates**: [`ProxyShareGates`](ProxyShareGates.md)

Defined in: [types/proxy.ts:4747](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4747)

The gate set, snapshotted at issue time.

---

### entitlementSnapshot

> **entitlementSnapshot**: `number` \| `"unlimited"`

Defined in: [types/proxy.ts:4749](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4749)

Coin balance at issue time; "unlimited" for an uncapped grant.

---

### signature

> **signature**: `string`

Defined in: [types/proxy.ts:4751](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4751)

HMAC over the payload, keyed by the grant's lease secret.
