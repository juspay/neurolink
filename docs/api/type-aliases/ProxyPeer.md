[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPeer

# Type Alias: ProxyPeer

> **ProxyPeer** = `object`

Defined in: [types/proxy.ts:4033](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4033)

A lender this node may borrow from.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4034](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4034)

---

### name

> **name**: `string`

Defined in: [types/proxy.ts:4035](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4035)

---

### url

> **url**: `string`

Defined in: [types/proxy.ts:4036](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4036)

---

### token

> **token**: `string`

Defined in: [types/proxy.ts:4037](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4037)

---

### priority

> **priority**: `number`

Defined in: [types/proxy.ts:4039](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4039)

Lower is tried first. Peers of equal priority keep insertion order.

---

### enabled

> **enabled**: `boolean`

Defined in: [types/proxy.ts:4040](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4040)

---

### createdAt

> **createdAt**: `number`

Defined in: [types/proxy.ts:4041](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4041)

---

### updatedAt

> **updatedAt**: `number`

Defined in: [types/proxy.ts:4042](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4042)

---

### note?

> `optional` **note?**: `string`

Defined in: [types/proxy.ts:4043](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4043)

---

### lastUsedAt?

> `optional` **lastUsedAt?**: `number`

Defined in: [types/proxy.ts:4044](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4044)

---

### cooldownUntil?

> `optional` **cooldownUntil?**: `number`

Defined in: [types/proxy.ts:4045](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4045)

---

### cooldownReason?

> `optional` **cooldownReason?**: [`ProxyPeerCooldownReason`](ProxyPeerCooldownReason.md)

Defined in: [types/proxy.ts:4046](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4046)

---

### lastObservation?

> `optional` **lastObservation?**: [`ProxyPeerObservation`](ProxyPeerObservation.md)

Defined in: [types/proxy.ts:4047](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4047)

---

### pendingProvision?

> `optional` **pendingProvision?**: [`ProxyPeerPendingProvision`](ProxyPeerPendingProvision.md)

Defined in: [types/proxy.ts:4049](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4049)

Set while a split-PKCE provisioning request is outstanding.

---

### receiptSecret?

> `optional` **receiptSecret?**: `string`

Defined in: [types/proxy.ts:4051](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4051)

Shared secret this lender's receipts are signed with, when known.

---

### reciprocalPeer?

> `optional` **reciprocalPeer?**: `string`

Defined in: [types/proxy.ts:4053](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4053)

Label of the grant this node issued to the same person, for netting.

---

### lastReceiptSequence?

> `optional` **lastReceiptSequence?**: `number`

Defined in: [types/proxy.ts:4055](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4055)

Highest receipt sequence collected from this lender.
