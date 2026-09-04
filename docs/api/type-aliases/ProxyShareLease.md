[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareLease

# Type Alias: ProxyShareLease

> **ProxyShareLease** = `object`

Defined in: [types/proxy.ts:4122](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4122)

The offline-survivable projection of a grant.

A complete-mode borrower holds a credential on the lender's account and calls
the upstream directly, so the lender's gate is not in the request path. The
lease is what control looks like without that gate: the borrower enforces it
locally, refreshes it by heartbeat, and stops when it can no longer prove the
lender still consents.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4123](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4123)

---

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4124](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4124)

---

### peerLabel

> **peerLabel**: `string`

Defined in: [types/proxy.ts:4125](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4125)

---

### issuedAt

> **issuedAt**: `number`

Defined in: [types/proxy.ts:4126](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4126)

---

### notAfter

> **notAfter**: `number`

Defined in: [types/proxy.ts:4128](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4128)

Hard stop, honored even by a borrower that never calls home again.

---

### heartbeatEveryMs

> **heartbeatEveryMs**: `number`

Defined in: [types/proxy.ts:4130](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4130)

How often the borrower should check in.

---

### offlineGraceMs

> **offlineGraceMs**: `number`

Defined in: [types/proxy.ts:4132](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4132)

How long the borrower may keep serving while the lender is unreachable.

---

### gates

> **gates**: [`ProxyShareGates`](ProxyShareGates.md)

Defined in: [types/proxy.ts:4134](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4134)

The gate set, snapshotted at issue time.

---

### entitlementSnapshot

> **entitlementSnapshot**: `number` \| `"unlimited"`

Defined in: [types/proxy.ts:4136](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4136)

Coin balance at issue time; "unlimited" for an uncapped grant.

---

### signature

> **signature**: `string`

Defined in: [types/proxy.ts:4138](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4138)

HMAC over the payload, keyed by the grant's lease secret.
