[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPeer

# Type Alias: ProxyPeer

> **ProxyPeer** = `object`

Defined in: [types/proxy.ts:3912](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3912)

A lender this node may borrow from.

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:3913](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3913)

---

### name

> **name**: `string`

Defined in: [types/proxy.ts:3914](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3914)

---

### url

> **url**: `string`

Defined in: [types/proxy.ts:3915](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3915)

---

### token

> **token**: `string`

Defined in: [types/proxy.ts:3916](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3916)

---

### priority

> **priority**: `number`

Defined in: [types/proxy.ts:3918](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3918)

Lower is tried first. Peers of equal priority keep insertion order.

---

### enabled

> **enabled**: `boolean`

Defined in: [types/proxy.ts:3919](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3919)

---

### createdAt

> **createdAt**: `number`

Defined in: [types/proxy.ts:3920](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3920)

---

### updatedAt

> **updatedAt**: `number`

Defined in: [types/proxy.ts:3921](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3921)

---

### note?

> `optional` **note?**: `string`

Defined in: [types/proxy.ts:3922](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3922)

---

### lastUsedAt?

> `optional` **lastUsedAt?**: `number`

Defined in: [types/proxy.ts:3923](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3923)

---

### cooldownUntil?

> `optional` **cooldownUntil?**: `number`

Defined in: [types/proxy.ts:3924](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3924)

---

### cooldownReason?

> `optional` **cooldownReason?**: [`ProxyPeerCooldownReason`](ProxyPeerCooldownReason.md)

Defined in: [types/proxy.ts:3925](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3925)

---

### lastObservation?

> `optional` **lastObservation?**: [`ProxyPeerObservation`](ProxyPeerObservation.md)

Defined in: [types/proxy.ts:3926](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3926)

---

### pendingProvision?

> `optional` **pendingProvision?**: [`ProxyPeerPendingProvision`](ProxyPeerPendingProvision.md)

Defined in: [types/proxy.ts:3928](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3928)

Set while a split-PKCE provisioning request is outstanding.

---

### receiptSecret?

> `optional` **receiptSecret?**: `string`

Defined in: [types/proxy.ts:3930](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3930)

Shared secret this lender's receipts are signed with, when known.

---

### reciprocalPeer?

> `optional` **reciprocalPeer?**: `string`

Defined in: [types/proxy.ts:3932](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3932)

Label of the grant this node issued to the same person, for netting.

---

### lastReceiptSequence?

> `optional` **lastReceiptSequence?**: `number`

Defined in: [types/proxy.ts:3934](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3934)

Highest receipt sequence collected from this lender.
