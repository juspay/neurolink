[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyAccountRoutingDecision

# Type Alias: ProxyAccountRoutingDecision

> **ProxyAccountRoutingDecision** = `object`

Defined in: [types/proxy.ts:617](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L617)

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:618](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L618)

---

### evaluatedAt

> **evaluatedAt**: `string`

Defined in: [types/proxy.ts:619](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L619)

---

### strategy

> **strategy**: [`ProxyAccountRoutingStrategy`](ProxyAccountRoutingStrategy.md)

Defined in: [types/proxy.ts:620](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L620)

---

### mode

> **mode**: [`ProxyAccountRoutingMode`](ProxyAccountRoutingMode.md)

Defined in: [types/proxy.ts:621](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L621)

---

### selectionReason

> **selectionReason**: [`ProxyAccountRoutingReason`](ProxyAccountRoutingReason.md)

Defined in: [types/proxy.ts:622](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L622)

---

### quotaRoutingEnabled

> **quotaRoutingEnabled**: `boolean`

Defined in: [types/proxy.ts:623](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L623)

---

### quotaInputsUsed

> **quotaInputsUsed**: `boolean`

Defined in: [types/proxy.ts:624](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L624)

---

### sessionSoftLimit

> **sessionSoftLimit**: `number`

Defined in: [types/proxy.ts:625](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L625)

---

### sessionResetToleranceMs

> **sessionResetToleranceMs**: `number`

Defined in: [types/proxy.ts:626](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L626)

---

### configuredPrimaryAccount

> **configuredPrimaryAccount**: `string` \| `null`

Defined in: [types/proxy.ts:627](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L627)

---

### configuredPrimaryMatched

> **configuredPrimaryMatched**: `boolean`

Defined in: [types/proxy.ts:628](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L628)

---

### rotationOffset

> **rotationOffset**: `number`

Defined in: [types/proxy.ts:629](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L629)

---

### initialAccount

> **initialAccount**: `string`

Defined in: [types/proxy.ts:630](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L630)

---

### candidates

> **candidates**: [`ProxyAccountRoutingCandidate`](ProxyAccountRoutingCandidate.md)[]

Defined in: [types/proxy.ts:631](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L631)
