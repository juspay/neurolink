[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareLease

# Type Alias: ProxyShareLease

> **ProxyShareLease** = `object`

Defined in: [types/proxy.ts:4460](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4460)

The offline-survivable projection of a grant.

A complete-mode borrower holds a credential on the lender's account and calls
the upstream directly, so the lender's gate is not in the request path. The
lease is what control looks like without that gate: the borrower enforces it
locally, refreshes it by heartbeat, and stops when it can no longer prove the
lender still consents.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4461](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4461)

---

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4462](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4462)

---

### peerLabel

> **peerLabel**: `string`

Defined in: [types/proxy.ts:4463](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4463)

---

### issuedAt

> **issuedAt**: `number`

Defined in: [types/proxy.ts:4464](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4464)

---

### notAfter

> **notAfter**: `number`

Defined in: [types/proxy.ts:4466](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4466)

Hard stop, honored even by a borrower that never calls home again.

---

### heartbeatEveryMs

> **heartbeatEveryMs**: `number`

Defined in: [types/proxy.ts:4468](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4468)

How often the borrower should check in.

---

### offlineGraceMs

> **offlineGraceMs**: `number`

Defined in: [types/proxy.ts:4470](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4470)

How long the borrower may keep serving while the lender is unreachable.

---

### gates

> **gates**: [`ProxyShareGates`](ProxyShareGates.md)

Defined in: [types/proxy.ts:4472](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4472)

The gate set, snapshotted at issue time.

---

### entitlementSnapshot

> **entitlementSnapshot**: `number` \| `"unlimited"`

Defined in: [types/proxy.ts:4474](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4474)

Coin balance at issue time; "unlimited" for an uncapped grant.

---

### signature

> **signature**: `string`

Defined in: [types/proxy.ts:4476](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4476)

HMAC over the payload, keyed by the grant's lease secret.
