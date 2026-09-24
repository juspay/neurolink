[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPeer

# Type Alias: ProxyPeer

> **ProxyPeer** = `object`

Defined in: [types/proxy.ts:4754](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4754)

A lender this node may borrow from.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4755](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4755)

---

### name

> **name**: `string`

Defined in: [types/proxy.ts:4756](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4756)

---

### url

> **url**: `string`

Defined in: [types/proxy.ts:4757](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4757)

---

### token

> **token**: `string`

Defined in: [types/proxy.ts:4758](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4758)

---

### priority

> **priority**: `number`

Defined in: [types/proxy.ts:4760](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4760)

Lower is tried first. Peers of equal priority keep insertion order.

---

### enabled

> **enabled**: `boolean`

Defined in: [types/proxy.ts:4761](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4761)

---

### createdAt

> **createdAt**: `number`

Defined in: [types/proxy.ts:4762](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4762)

---

### updatedAt

> **updatedAt**: `number`

Defined in: [types/proxy.ts:4763](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4763)

---

### note?

> `optional` **note?**: `string`

Defined in: [types/proxy.ts:4764](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4764)

---

### lastUsedAt?

> `optional` **lastUsedAt?**: `number`

Defined in: [types/proxy.ts:4765](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4765)

---

### cooldownUntil?

> `optional` **cooldownUntil?**: `number`

Defined in: [types/proxy.ts:4766](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4766)

---

### cooldownReason?

> `optional` **cooldownReason?**: [`ProxyPeerCooldownReason`](ProxyPeerCooldownReason.md)

Defined in: [types/proxy.ts:4767](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4767)

---

### lastObservation?

> `optional` **lastObservation?**: [`ProxyPeerObservation`](ProxyPeerObservation.md)

Defined in: [types/proxy.ts:4768](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4768)

---

### pendingProvision?

> `optional` **pendingProvision?**: [`ProxyPeerPendingProvision`](ProxyPeerPendingProvision.md)

Defined in: [types/proxy.ts:4770](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4770)

Set while a split-PKCE provisioning request is outstanding.

---

### receiptSecret?

> `optional` **receiptSecret?**: `string`

Defined in: [types/proxy.ts:4772](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4772)

Shared secret this lender's receipts are signed with, when known.

---

### reciprocalPeer?

> `optional` **reciprocalPeer?**: `string`

Defined in: [types/proxy.ts:4774](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4774)

Label of the grant this node issued to the same person, for netting.

---

### lastReceiptSequence?

> `optional` **lastReceiptSequence?**: `number`

Defined in: [types/proxy.ts:4776](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4776)

Highest receipt sequence collected from this lender.
