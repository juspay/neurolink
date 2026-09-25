[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareLease

# Type Alias: ProxyShareLease

> **ProxyShareLease** = `object`

Defined in: [types/proxy.ts:4805](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4805)

The offline-survivable projection of a grant.

A complete-mode borrower holds a credential on the lender's account and calls
the upstream directly, so the lender's gate is not in the request path. The
lease is what control looks like without that gate: the borrower enforces it
locally, refreshes it by heartbeat, and stops when it can no longer prove the
lender still consents.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4806](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4806)

---

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4807](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4807)

---

### peerLabel

> **peerLabel**: `string`

Defined in: [types/proxy.ts:4808](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4808)

---

### issuedAt

> **issuedAt**: `number`

Defined in: [types/proxy.ts:4809](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4809)

---

### notAfter

> **notAfter**: `number`

Defined in: [types/proxy.ts:4811](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4811)

Hard stop, honored even by a borrower that never calls home again.

---

### heartbeatEveryMs

> **heartbeatEveryMs**: `number`

Defined in: [types/proxy.ts:4813](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4813)

How often the borrower should check in.

---

### offlineGraceMs

> **offlineGraceMs**: `number`

Defined in: [types/proxy.ts:4815](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4815)

How long the borrower may keep serving while the lender is unreachable.

---

### gates

> **gates**: [`ProxyShareGates`](ProxyShareGates.md)

Defined in: [types/proxy.ts:4817](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4817)

The gate set, snapshotted at issue time.

---

### entitlementSnapshot

> **entitlementSnapshot**: `number` \| `"unlimited"`

Defined in: [types/proxy.ts:4819](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4819)

Coin balance at issue time; "unlimited" for an uncapped grant.

---

### signature

> **signature**: `string`

Defined in: [types/proxy.ts:4821](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4821)

HMAC over the payload, keyed by the grant's lease secret.
