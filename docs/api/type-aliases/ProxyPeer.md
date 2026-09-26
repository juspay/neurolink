[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPeer

# Type Alias: ProxyPeer

> **ProxyPeer** = `object`

Defined in: [types/proxy.ts:4764](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4764)

A lender this node may borrow from.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:4765](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4765)

---

### name

> **name**: `string`

Defined in: [types/proxy.ts:4766](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4766)

---

### url

> **url**: `string`

Defined in: [types/proxy.ts:4767](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4767)

---

### token

> **token**: `string`

Defined in: [types/proxy.ts:4768](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4768)

---

### priority

> **priority**: `number`

Defined in: [types/proxy.ts:4770](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4770)

Lower is tried first. Peers of equal priority keep insertion order.

---

### enabled

> **enabled**: `boolean`

Defined in: [types/proxy.ts:4771](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4771)

---

### createdAt

> **createdAt**: `number`

Defined in: [types/proxy.ts:4772](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4772)

---

### updatedAt

> **updatedAt**: `number`

Defined in: [types/proxy.ts:4773](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4773)

---

### note?

> `optional` **note?**: `string`

Defined in: [types/proxy.ts:4774](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4774)

---

### lastUsedAt?

> `optional` **lastUsedAt?**: `number`

Defined in: [types/proxy.ts:4775](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4775)

---

### cooldownUntil?

> `optional` **cooldownUntil?**: `number`

Defined in: [types/proxy.ts:4776](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4776)

---

### cooldownReason?

> `optional` **cooldownReason?**: [`ProxyPeerCooldownReason`](ProxyPeerCooldownReason.md)

Defined in: [types/proxy.ts:4777](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4777)

---

### lastObservation?

> `optional` **lastObservation?**: [`ProxyPeerObservation`](ProxyPeerObservation.md)

Defined in: [types/proxy.ts:4778](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4778)

---

### pendingProvision?

> `optional` **pendingProvision?**: [`ProxyPeerPendingProvision`](ProxyPeerPendingProvision.md)

Defined in: [types/proxy.ts:4780](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4780)

Set while a split-PKCE provisioning request is outstanding.

---

### receiptSecret?

> `optional` **receiptSecret?**: `string`

Defined in: [types/proxy.ts:4782](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4782)

Shared secret this lender's receipts are signed with, when known.

---

### reciprocalPeer?

> `optional` **reciprocalPeer?**: `string`

Defined in: [types/proxy.ts:4784](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4784)

Label of the grant this node issued to the same person, for netting.

---

### lastReceiptSequence?

> `optional` **lastReceiptSequence?**: `number`

Defined in: [types/proxy.ts:4786](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4786)

Highest receipt sequence collected from this lender.
