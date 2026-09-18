[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareLease

# Type Alias: ProxyShareLease

> **ProxyShareLease** = `object`

Defined in: [types/proxy.ts:4485](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4485)

The offline-survivable projection of a grant.

A complete-mode borrower holds a credential on the lender's account and calls
the upstream directly, so the lender's gate is not in the request path. The
lease is what control looks like without that gate: the borrower enforces it
locally, refreshes it by heartbeat, and stops when it can no longer prove the
lender still consents.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4486](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4486)

---

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4487](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4487)

---

### peerLabel

> **peerLabel**: `string`

Defined in: [types/proxy.ts:4488](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4488)

---

### issuedAt

> **issuedAt**: `number`

Defined in: [types/proxy.ts:4489](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4489)

---

### notAfter

> **notAfter**: `number`

Defined in: [types/proxy.ts:4491](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4491)

Hard stop, honored even by a borrower that never calls home again.

---

### heartbeatEveryMs

> **heartbeatEveryMs**: `number`

Defined in: [types/proxy.ts:4493](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4493)

How often the borrower should check in.

---

### offlineGraceMs

> **offlineGraceMs**: `number`

Defined in: [types/proxy.ts:4495](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4495)

How long the borrower may keep serving while the lender is unreachable.

---

### gates

> **gates**: [`ProxyShareGates`](ProxyShareGates.md)

Defined in: [types/proxy.ts:4497](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4497)

The gate set, snapshotted at issue time.

---

### entitlementSnapshot

> **entitlementSnapshot**: `number` \| `"unlimited"`

Defined in: [types/proxy.ts:4499](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4499)

Coin balance at issue time; "unlimited" for an uncapped grant.

---

### signature

> **signature**: `string`

Defined in: [types/proxy.ts:4501](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4501)

HMAC over the payload, keyed by the grant's lease secret.
