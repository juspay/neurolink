[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareLease

# Type Alias: ProxyShareLease

> **ProxyShareLease** = `object`

Defined in: [types/proxy.ts:4615](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4615)

The offline-survivable projection of a grant.

A complete-mode borrower holds a credential on the lender's account and calls
the upstream directly, so the lender's gate is not in the request path. The
lease is what control looks like without that gate: the borrower enforces it
locally, refreshes it by heartbeat, and stops when it can no longer prove the
lender still consents.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4616](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4616)

---

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4617](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4617)

---

### peerLabel

> **peerLabel**: `string`

Defined in: [types/proxy.ts:4618](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4618)

---

### issuedAt

> **issuedAt**: `number`

Defined in: [types/proxy.ts:4619](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4619)

---

### notAfter

> **notAfter**: `number`

Defined in: [types/proxy.ts:4621](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4621)

Hard stop, honored even by a borrower that never calls home again.

---

### heartbeatEveryMs

> **heartbeatEveryMs**: `number`

Defined in: [types/proxy.ts:4623](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4623)

How often the borrower should check in.

---

### offlineGraceMs

> **offlineGraceMs**: `number`

Defined in: [types/proxy.ts:4625](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4625)

How long the borrower may keep serving while the lender is unreachable.

---

### gates

> **gates**: [`ProxyShareGates`](ProxyShareGates.md)

Defined in: [types/proxy.ts:4627](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4627)

The gate set, snapshotted at issue time.

---

### entitlementSnapshot

> **entitlementSnapshot**: `number` \| `"unlimited"`

Defined in: [types/proxy.ts:4629](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4629)

Coin balance at issue time; "unlimited" for an uncapped grant.

---

### signature

> **signature**: `string`

Defined in: [types/proxy.ts:4631](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4631)

HMAC over the payload, keyed by the grant's lease secret.
