[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPeer

# Type Alias: ProxyPeer

> **ProxyPeer** = `object`

Defined in: [types/proxy.ts:4019](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4019)

A lender this node may borrow from.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4020](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4020)

---

### name

> **name**: `string`

Defined in: [types/proxy.ts:4021](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4021)

---

### url

> **url**: `string`

Defined in: [types/proxy.ts:4022](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4022)

---

### token

> **token**: `string`

Defined in: [types/proxy.ts:4023](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4023)

---

### priority

> **priority**: `number`

Defined in: [types/proxy.ts:4025](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4025)

Lower is tried first. Peers of equal priority keep insertion order.

---

### enabled

> **enabled**: `boolean`

Defined in: [types/proxy.ts:4026](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4026)

---

### createdAt

> **createdAt**: `number`

Defined in: [types/proxy.ts:4027](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4027)

---

### updatedAt

> **updatedAt**: `number`

Defined in: [types/proxy.ts:4028](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4028)

---

### note?

> `optional` **note?**: `string`

Defined in: [types/proxy.ts:4029](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4029)

---

### lastUsedAt?

> `optional` **lastUsedAt?**: `number`

Defined in: [types/proxy.ts:4030](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4030)

---

### cooldownUntil?

> `optional` **cooldownUntil?**: `number`

Defined in: [types/proxy.ts:4031](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4031)

---

### cooldownReason?

> `optional` **cooldownReason?**: [`ProxyPeerCooldownReason`](ProxyPeerCooldownReason.md)

Defined in: [types/proxy.ts:4032](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4032)

---

### lastObservation?

> `optional` **lastObservation?**: [`ProxyPeerObservation`](ProxyPeerObservation.md)

Defined in: [types/proxy.ts:4033](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4033)

---

### pendingProvision?

> `optional` **pendingProvision?**: [`ProxyPeerPendingProvision`](ProxyPeerPendingProvision.md)

Defined in: [types/proxy.ts:4035](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4035)

Set while a split-PKCE provisioning request is outstanding.

---

### receiptSecret?

> `optional` **receiptSecret?**: `string`

Defined in: [types/proxy.ts:4037](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4037)

Shared secret this lender's receipts are signed with, when known.

---

### reciprocalPeer?

> `optional` **reciprocalPeer?**: `string`

Defined in: [types/proxy.ts:4039](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4039)

Label of the grant this node issued to the same person, for netting.

---

### lastReceiptSequence?

> `optional` **lastReceiptSequence?**: `number`

Defined in: [types/proxy.ts:4041](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4041)

Highest receipt sequence collected from this lender.
