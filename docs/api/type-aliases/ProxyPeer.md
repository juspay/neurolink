[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPeer

# Type Alias: ProxyPeer

> **ProxyPeer** = `object`

Defined in: [types/proxy.ts:4704](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4704)

A lender this node may borrow from.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4705](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4705)

---

### name

> **name**: `string`

Defined in: [types/proxy.ts:4706](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4706)

---

### url

> **url**: `string`

Defined in: [types/proxy.ts:4707](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4707)

---

### token

> **token**: `string`

Defined in: [types/proxy.ts:4708](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4708)

---

### priority

> **priority**: `number`

Defined in: [types/proxy.ts:4710](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4710)

Lower is tried first. Peers of equal priority keep insertion order.

---

### enabled

> **enabled**: `boolean`

Defined in: [types/proxy.ts:4711](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4711)

---

### createdAt

> **createdAt**: `number`

Defined in: [types/proxy.ts:4712](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4712)

---

### updatedAt

> **updatedAt**: `number`

Defined in: [types/proxy.ts:4713](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4713)

---

### note?

> `optional` **note?**: `string`

Defined in: [types/proxy.ts:4714](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4714)

---

### lastUsedAt?

> `optional` **lastUsedAt?**: `number`

Defined in: [types/proxy.ts:4715](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4715)

---

### cooldownUntil?

> `optional` **cooldownUntil?**: `number`

Defined in: [types/proxy.ts:4716](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4716)

---

### cooldownReason?

> `optional` **cooldownReason?**: [`ProxyPeerCooldownReason`](ProxyPeerCooldownReason.md)

Defined in: [types/proxy.ts:4717](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4717)

---

### lastObservation?

> `optional` **lastObservation?**: [`ProxyPeerObservation`](ProxyPeerObservation.md)

Defined in: [types/proxy.ts:4718](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4718)

---

### pendingProvision?

> `optional` **pendingProvision?**: [`ProxyPeerPendingProvision`](ProxyPeerPendingProvision.md)

Defined in: [types/proxy.ts:4720](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4720)

Set while a split-PKCE provisioning request is outstanding.

---

### receiptSecret?

> `optional` **receiptSecret?**: `string`

Defined in: [types/proxy.ts:4722](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4722)

Shared secret this lender's receipts are signed with, when known.

---

### reciprocalPeer?

> `optional` **reciprocalPeer?**: `string`

Defined in: [types/proxy.ts:4724](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4724)

Label of the grant this node issued to the same person, for netting.

---

### lastReceiptSequence?

> `optional` **lastReceiptSequence?**: `number`

Defined in: [types/proxy.ts:4726](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4726)

Highest receipt sequence collected from this lender.
