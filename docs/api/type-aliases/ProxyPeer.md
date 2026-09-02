[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPeer

# Type Alias: ProxyPeer

> **ProxyPeer** = `object`

Defined in: [types/proxy.ts:4013](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4013)

A lender this node may borrow from.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4014](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4014)

---

### name

> **name**: `string`

Defined in: [types/proxy.ts:4015](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4015)

---

### url

> **url**: `string`

Defined in: [types/proxy.ts:4016](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4016)

---

### token

> **token**: `string`

Defined in: [types/proxy.ts:4017](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4017)

---

### priority

> **priority**: `number`

Defined in: [types/proxy.ts:4019](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4019)

Lower is tried first. Peers of equal priority keep insertion order.

---

### enabled

> **enabled**: `boolean`

Defined in: [types/proxy.ts:4020](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4020)

---

### createdAt

> **createdAt**: `number`

Defined in: [types/proxy.ts:4021](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4021)

---

### updatedAt

> **updatedAt**: `number`

Defined in: [types/proxy.ts:4022](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4022)

---

### note?

> `optional` **note?**: `string`

Defined in: [types/proxy.ts:4023](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4023)

---

### lastUsedAt?

> `optional` **lastUsedAt?**: `number`

Defined in: [types/proxy.ts:4024](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4024)

---

### cooldownUntil?

> `optional` **cooldownUntil?**: `number`

Defined in: [types/proxy.ts:4025](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4025)

---

### cooldownReason?

> `optional` **cooldownReason?**: [`ProxyPeerCooldownReason`](ProxyPeerCooldownReason.md)

Defined in: [types/proxy.ts:4026](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4026)

---

### lastObservation?

> `optional` **lastObservation?**: [`ProxyPeerObservation`](ProxyPeerObservation.md)

Defined in: [types/proxy.ts:4027](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4027)

---

### pendingProvision?

> `optional` **pendingProvision?**: [`ProxyPeerPendingProvision`](ProxyPeerPendingProvision.md)

Defined in: [types/proxy.ts:4029](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4029)

Set while a split-PKCE provisioning request is outstanding.

---

### receiptSecret?

> `optional` **receiptSecret?**: `string`

Defined in: [types/proxy.ts:4031](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4031)

Shared secret this lender's receipts are signed with, when known.

---

### reciprocalPeer?

> `optional` **reciprocalPeer?**: `string`

Defined in: [types/proxy.ts:4033](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4033)

Label of the grant this node issued to the same person, for netting.

---

### lastReceiptSequence?

> `optional` **lastReceiptSequence?**: `number`

Defined in: [types/proxy.ts:4035](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4035)

Highest receipt sequence collected from this lender.
