[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareLease

# Type Alias: ProxyShareLease

> **ProxyShareLease** = `object`

Defined in: [types/proxy.ts:4085](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4085)

The offline-survivable projection of a grant.

A complete-mode borrower holds a credential on the lender's account and calls
the upstream directly, so the lender's gate is not in the request path. The
lease is what control looks like without that gate: the borrower enforces it
locally, refreshes it by heartbeat, and stops when it can no longer prove the
lender still consents.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4086](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4086)

---

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4087](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4087)

---

### peerLabel

> **peerLabel**: `string`

Defined in: [types/proxy.ts:4088](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4088)

---

### issuedAt

> **issuedAt**: `number`

Defined in: [types/proxy.ts:4089](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4089)

---

### notAfter

> **notAfter**: `number`

Defined in: [types/proxy.ts:4091](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4091)

Hard stop, honored even by a borrower that never calls home again.

---

### heartbeatEveryMs

> **heartbeatEveryMs**: `number`

Defined in: [types/proxy.ts:4093](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4093)

How often the borrower should check in.

---

### offlineGraceMs

> **offlineGraceMs**: `number`

Defined in: [types/proxy.ts:4095](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4095)

How long the borrower may keep serving while the lender is unreachable.

---

### gates

> **gates**: [`ProxyShareGates`](ProxyShareGates.md)

Defined in: [types/proxy.ts:4097](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4097)

The gate set, snapshotted at issue time.

---

### entitlementSnapshot

> **entitlementSnapshot**: `number` \| `"unlimited"`

Defined in: [types/proxy.ts:4099](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4099)

Coin balance at issue time; "unlimited" for an uncapped grant.

---

### signature

> **signature**: `string`

Defined in: [types/proxy.ts:4101](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4101)

HMAC over the payload, keyed by the grant's lease secret.
