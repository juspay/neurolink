[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareLease

# Type Alias: ProxyShareLease

> **ProxyShareLease** = `object`

Defined in: [types/proxy.ts:4867](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4867)

The offline-survivable projection of a grant.

A complete-mode borrower holds a credential on the lender's account and calls
the upstream directly, so the lender's gate is not in the request path. The
lease is what control looks like without that gate: the borrower enforces it
locally, refreshes it by heartbeat, and stops when it can no longer prove the
lender still consents.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4868](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4868)

---

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4869](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4869)

---

### peerLabel

> **peerLabel**: `string`

Defined in: [types/proxy.ts:4870](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4870)

---

### issuedAt

> **issuedAt**: `number`

Defined in: [types/proxy.ts:4871](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4871)

---

### notAfter

> **notAfter**: `number`

Defined in: [types/proxy.ts:4873](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4873)

Hard stop, honored even by a borrower that never calls home again.

---

### heartbeatEveryMs

> **heartbeatEveryMs**: `number`

Defined in: [types/proxy.ts:4875](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4875)

How often the borrower should check in.

---

### offlineGraceMs

> **offlineGraceMs**: `number`

Defined in: [types/proxy.ts:4877](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4877)

How long the borrower may keep serving while the lender is unreachable.

---

### gates

> **gates**: [`ProxyShareGates`](ProxyShareGates.md)

Defined in: [types/proxy.ts:4879](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4879)

The gate set, snapshotted at issue time.

---

### entitlementSnapshot

> **entitlementSnapshot**: `number` \| `"unlimited"`

Defined in: [types/proxy.ts:4881](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4881)

Coin balance at issue time; "unlimited" for an uncapped grant.

---

### signature

> **signature**: `string`

Defined in: [types/proxy.ts:4883](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4883)

HMAC over the payload, keyed by the grant's lease secret.
