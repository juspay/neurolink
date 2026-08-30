[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPeer

# Type Alias: ProxyPeer

> **ProxyPeer** = `object`

Defined in: [types/proxy.ts:3982](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3982)

A lender this node may borrow from.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:3983](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3983)

---

### name

> **name**: `string`

Defined in: [types/proxy.ts:3984](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3984)

---

### url

> **url**: `string`

Defined in: [types/proxy.ts:3985](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3985)

---

### token

> **token**: `string`

Defined in: [types/proxy.ts:3986](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3986)

---

### priority

> **priority**: `number`

Defined in: [types/proxy.ts:3988](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3988)

Lower is tried first. Peers of equal priority keep insertion order.

---

### enabled

> **enabled**: `boolean`

Defined in: [types/proxy.ts:3989](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3989)

---

### createdAt

> **createdAt**: `number`

Defined in: [types/proxy.ts:3990](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3990)

---

### updatedAt

> **updatedAt**: `number`

Defined in: [types/proxy.ts:3991](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3991)

---

### note?

> `optional` **note?**: `string`

Defined in: [types/proxy.ts:3992](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3992)

---

### lastUsedAt?

> `optional` **lastUsedAt?**: `number`

Defined in: [types/proxy.ts:3993](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3993)

---

### cooldownUntil?

> `optional` **cooldownUntil?**: `number`

Defined in: [types/proxy.ts:3994](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3994)

---

### cooldownReason?

> `optional` **cooldownReason?**: [`ProxyPeerCooldownReason`](ProxyPeerCooldownReason.md)

Defined in: [types/proxy.ts:3995](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3995)

---

### lastObservation?

> `optional` **lastObservation?**: [`ProxyPeerObservation`](ProxyPeerObservation.md)

Defined in: [types/proxy.ts:3996](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3996)

---

### pendingProvision?

> `optional` **pendingProvision?**: [`ProxyPeerPendingProvision`](ProxyPeerPendingProvision.md)

Defined in: [types/proxy.ts:3998](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3998)

Set while a split-PKCE provisioning request is outstanding.

---

### receiptSecret?

> `optional` **receiptSecret?**: `string`

Defined in: [types/proxy.ts:4000](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4000)

Shared secret this lender's receipts are signed with, when known.

---

### reciprocalPeer?

> `optional` **reciprocalPeer?**: `string`

Defined in: [types/proxy.ts:4002](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4002)

Label of the grant this node issued to the same person, for netting.

---

### lastReceiptSequence?

> `optional` **lastReceiptSequence?**: `number`

Defined in: [types/proxy.ts:4004](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4004)

Highest receipt sequence collected from this lender.
