[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareLease

# Type Alias: ProxyShareLease

> **ProxyShareLease** = `object`

Defined in: [types/proxy.ts:4107](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4107)

The offline-survivable projection of a grant.

A complete-mode borrower holds a credential on the lender's account and calls
the upstream directly, so the lender's gate is not in the request path. The
lease is what control looks like without that gate: the borrower enforces it
locally, refreshes it by heartbeat, and stops when it can no longer prove the
lender still consents.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4108](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4108)

---

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4109](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4109)

---

### peerLabel

> **peerLabel**: `string`

Defined in: [types/proxy.ts:4110](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4110)

---

### issuedAt

> **issuedAt**: `number`

Defined in: [types/proxy.ts:4111](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4111)

---

### notAfter

> **notAfter**: `number`

Defined in: [types/proxy.ts:4113](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4113)

Hard stop, honored even by a borrower that never calls home again.

---

### heartbeatEveryMs

> **heartbeatEveryMs**: `number`

Defined in: [types/proxy.ts:4115](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4115)

How often the borrower should check in.

---

### offlineGraceMs

> **offlineGraceMs**: `number`

Defined in: [types/proxy.ts:4117](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4117)

How long the borrower may keep serving while the lender is unreachable.

---

### gates

> **gates**: [`ProxyShareGates`](ProxyShareGates.md)

Defined in: [types/proxy.ts:4119](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4119)

The gate set, snapshotted at issue time.

---

### entitlementSnapshot

> **entitlementSnapshot**: `number` \| `"unlimited"`

Defined in: [types/proxy.ts:4121](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4121)

Coin balance at issue time; "unlimited" for an uncapped grant.

---

### signature

> **signature**: `string`

Defined in: [types/proxy.ts:4123](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4123)

HMAC over the payload, keyed by the grant's lease secret.
