[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareLease

# Type Alias: ProxyShareLease

> **ProxyShareLease** = `object`

Defined in: [types/proxy.ts:4335](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4335)

The offline-survivable projection of a grant.

A complete-mode borrower holds a credential on the lender's account and calls
the upstream directly, so the lender's gate is not in the request path. The
lease is what control looks like without that gate: the borrower enforces it
locally, refreshes it by heartbeat, and stops when it can no longer prove the
lender still consents.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4336](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4336)

---

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4337](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4337)

---

### peerLabel

> **peerLabel**: `string`

Defined in: [types/proxy.ts:4338](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4338)

---

### issuedAt

> **issuedAt**: `number`

Defined in: [types/proxy.ts:4339](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4339)

---

### notAfter

> **notAfter**: `number`

Defined in: [types/proxy.ts:4341](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4341)

Hard stop, honored even by a borrower that never calls home again.

---

### heartbeatEveryMs

> **heartbeatEveryMs**: `number`

Defined in: [types/proxy.ts:4343](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4343)

How often the borrower should check in.

---

### offlineGraceMs

> **offlineGraceMs**: `number`

Defined in: [types/proxy.ts:4345](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4345)

How long the borrower may keep serving while the lender is unreachable.

---

### gates

> **gates**: [`ProxyShareGates`](ProxyShareGates.md)

Defined in: [types/proxy.ts:4347](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4347)

The gate set, snapshotted at issue time.

---

### entitlementSnapshot

> **entitlementSnapshot**: `number` \| `"unlimited"`

Defined in: [types/proxy.ts:4349](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4349)

Coin balance at issue time; "unlimited" for an uncapped grant.

---

### signature

> **signature**: `string`

Defined in: [types/proxy.ts:4351](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4351)

HMAC over the payload, keyed by the grant's lease secret.
