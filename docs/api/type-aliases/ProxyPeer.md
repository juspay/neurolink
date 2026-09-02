[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPeer

# Type Alias: ProxyPeer

> **ProxyPeer** = `object`

Defined in: [types/proxy.ts:4004](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4004)

A lender this node may borrow from.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4005](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4005)

---

### name

> **name**: `string`

Defined in: [types/proxy.ts:4006](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4006)

---

### url

> **url**: `string`

Defined in: [types/proxy.ts:4007](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4007)

---

### token

> **token**: `string`

Defined in: [types/proxy.ts:4008](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4008)

---

### priority

> **priority**: `number`

Defined in: [types/proxy.ts:4010](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4010)

Lower is tried first. Peers of equal priority keep insertion order.

---

### enabled

> **enabled**: `boolean`

Defined in: [types/proxy.ts:4011](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4011)

---

### createdAt

> **createdAt**: `number`

Defined in: [types/proxy.ts:4012](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4012)

---

### updatedAt

> **updatedAt**: `number`

Defined in: [types/proxy.ts:4013](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4013)

---

### note?

> `optional` **note?**: `string`

Defined in: [types/proxy.ts:4014](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4014)

---

### lastUsedAt?

> `optional` **lastUsedAt?**: `number`

Defined in: [types/proxy.ts:4015](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4015)

---

### cooldownUntil?

> `optional` **cooldownUntil?**: `number`

Defined in: [types/proxy.ts:4016](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4016)

---

### cooldownReason?

> `optional` **cooldownReason?**: [`ProxyPeerCooldownReason`](ProxyPeerCooldownReason.md)

Defined in: [types/proxy.ts:4017](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4017)

---

### lastObservation?

> `optional` **lastObservation?**: [`ProxyPeerObservation`](ProxyPeerObservation.md)

Defined in: [types/proxy.ts:4018](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4018)

---

### pendingProvision?

> `optional` **pendingProvision?**: [`ProxyPeerPendingProvision`](ProxyPeerPendingProvision.md)

Defined in: [types/proxy.ts:4020](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4020)

Set while a split-PKCE provisioning request is outstanding.

---

### receiptSecret?

> `optional` **receiptSecret?**: `string`

Defined in: [types/proxy.ts:4022](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4022)

Shared secret this lender's receipts are signed with, when known.

---

### reciprocalPeer?

> `optional` **reciprocalPeer?**: `string`

Defined in: [types/proxy.ts:4024](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4024)

Label of the grant this node issued to the same person, for netting.

---

### lastReceiptSequence?

> `optional` **lastReceiptSequence?**: `number`

Defined in: [types/proxy.ts:4026](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4026)

Highest receipt sequence collected from this lender.
