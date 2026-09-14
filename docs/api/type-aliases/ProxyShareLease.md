[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareLease

# Type Alias: ProxyShareLease

> **ProxyShareLease** = `object`

Defined in: [types/proxy.ts:4446](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4446)

The offline-survivable projection of a grant.

A complete-mode borrower holds a credential on the lender's account and calls
the upstream directly, so the lender's gate is not in the request path. The
lease is what control looks like without that gate: the borrower enforces it
locally, refreshes it by heartbeat, and stops when it can no longer prove the
lender still consents.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4447](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4447)

---

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4448](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4448)

---

### peerLabel

> **peerLabel**: `string`

Defined in: [types/proxy.ts:4449](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4449)

---

### issuedAt

> **issuedAt**: `number`

Defined in: [types/proxy.ts:4450](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4450)

---

### notAfter

> **notAfter**: `number`

Defined in: [types/proxy.ts:4452](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4452)

Hard stop, honored even by a borrower that never calls home again.

---

### heartbeatEveryMs

> **heartbeatEveryMs**: `number`

Defined in: [types/proxy.ts:4454](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4454)

How often the borrower should check in.

---

### offlineGraceMs

> **offlineGraceMs**: `number`

Defined in: [types/proxy.ts:4456](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4456)

How long the borrower may keep serving while the lender is unreachable.

---

### gates

> **gates**: [`ProxyShareGates`](ProxyShareGates.md)

Defined in: [types/proxy.ts:4458](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4458)

The gate set, snapshotted at issue time.

---

### entitlementSnapshot

> **entitlementSnapshot**: `number` \| `"unlimited"`

Defined in: [types/proxy.ts:4460](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4460)

Coin balance at issue time; "unlimited" for an uncapped grant.

---

### signature

> **signature**: `string`

Defined in: [types/proxy.ts:4462](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4462)

HMAC over the payload, keyed by the grant's lease secret.
