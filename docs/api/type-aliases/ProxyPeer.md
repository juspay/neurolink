[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPeer

# Type Alias: ProxyPeer

> **ProxyPeer** = `object`

Defined in: [types/proxy.ts:4629](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4629)

A lender this node may borrow from.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4630](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4630)

---

### name

> **name**: `string`

Defined in: [types/proxy.ts:4631](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4631)

---

### url

> **url**: `string`

Defined in: [types/proxy.ts:4632](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4632)

---

### token

> **token**: `string`

Defined in: [types/proxy.ts:4633](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4633)

---

### priority

> **priority**: `number`

Defined in: [types/proxy.ts:4635](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4635)

Lower is tried first. Peers of equal priority keep insertion order.

---

### enabled

> **enabled**: `boolean`

Defined in: [types/proxy.ts:4636](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4636)

---

### createdAt

> **createdAt**: `number`

Defined in: [types/proxy.ts:4637](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4637)

---

### updatedAt

> **updatedAt**: `number`

Defined in: [types/proxy.ts:4638](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4638)

---

### note?

> `optional` **note?**: `string`

Defined in: [types/proxy.ts:4639](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4639)

---

### lastUsedAt?

> `optional` **lastUsedAt?**: `number`

Defined in: [types/proxy.ts:4640](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4640)

---

### cooldownUntil?

> `optional` **cooldownUntil?**: `number`

Defined in: [types/proxy.ts:4641](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4641)

---

### cooldownReason?

> `optional` **cooldownReason?**: [`ProxyPeerCooldownReason`](ProxyPeerCooldownReason.md)

Defined in: [types/proxy.ts:4642](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4642)

---

### lastObservation?

> `optional` **lastObservation?**: [`ProxyPeerObservation`](ProxyPeerObservation.md)

Defined in: [types/proxy.ts:4643](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4643)

---

### pendingProvision?

> `optional` **pendingProvision?**: [`ProxyPeerPendingProvision`](ProxyPeerPendingProvision.md)

Defined in: [types/proxy.ts:4645](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4645)

Set while a split-PKCE provisioning request is outstanding.

---

### receiptSecret?

> `optional` **receiptSecret?**: `string`

Defined in: [types/proxy.ts:4647](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4647)

Shared secret this lender's receipts are signed with, when known.

---

### reciprocalPeer?

> `optional` **reciprocalPeer?**: `string`

Defined in: [types/proxy.ts:4649](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4649)

Label of the grant this node issued to the same person, for netting.

---

### lastReceiptSequence?

> `optional` **lastReceiptSequence?**: `number`

Defined in: [types/proxy.ts:4651](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4651)

Highest receipt sequence collected from this lender.
