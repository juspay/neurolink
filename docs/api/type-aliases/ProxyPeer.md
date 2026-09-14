[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPeer

# Type Alias: ProxyPeer

> **ProxyPeer** = `object`

Defined in: [types/proxy.ts:4343](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4343)

A lender this node may borrow from.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4344](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4344)

---

### name

> **name**: `string`

Defined in: [types/proxy.ts:4345](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4345)

---

### url

> **url**: `string`

Defined in: [types/proxy.ts:4346](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4346)

---

### token

> **token**: `string`

Defined in: [types/proxy.ts:4347](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4347)

---

### priority

> **priority**: `number`

Defined in: [types/proxy.ts:4349](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4349)

Lower is tried first. Peers of equal priority keep insertion order.

---

### enabled

> **enabled**: `boolean`

Defined in: [types/proxy.ts:4350](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4350)

---

### createdAt

> **createdAt**: `number`

Defined in: [types/proxy.ts:4351](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4351)

---

### updatedAt

> **updatedAt**: `number`

Defined in: [types/proxy.ts:4352](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4352)

---

### note?

> `optional` **note?**: `string`

Defined in: [types/proxy.ts:4353](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4353)

---

### lastUsedAt?

> `optional` **lastUsedAt?**: `number`

Defined in: [types/proxy.ts:4354](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4354)

---

### cooldownUntil?

> `optional` **cooldownUntil?**: `number`

Defined in: [types/proxy.ts:4355](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4355)

---

### cooldownReason?

> `optional` **cooldownReason?**: [`ProxyPeerCooldownReason`](ProxyPeerCooldownReason.md)

Defined in: [types/proxy.ts:4356](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4356)

---

### lastObservation?

> `optional` **lastObservation?**: [`ProxyPeerObservation`](ProxyPeerObservation.md)

Defined in: [types/proxy.ts:4357](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4357)

---

### pendingProvision?

> `optional` **pendingProvision?**: [`ProxyPeerPendingProvision`](ProxyPeerPendingProvision.md)

Defined in: [types/proxy.ts:4359](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4359)

Set while a split-PKCE provisioning request is outstanding.

---

### receiptSecret?

> `optional` **receiptSecret?**: `string`

Defined in: [types/proxy.ts:4361](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4361)

Shared secret this lender's receipts are signed with, when known.

---

### reciprocalPeer?

> `optional` **reciprocalPeer?**: `string`

Defined in: [types/proxy.ts:4363](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4363)

Label of the grant this node issued to the same person, for netting.

---

### lastReceiptSequence?

> `optional` **lastReceiptSequence?**: `number`

Defined in: [types/proxy.ts:4365](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4365)

Highest receipt sequence collected from this lender.
