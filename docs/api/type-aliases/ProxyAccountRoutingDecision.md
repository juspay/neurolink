[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyAccountRoutingDecision

# Type Alias: ProxyAccountRoutingDecision

> **ProxyAccountRoutingDecision** = `object`

Defined in: [types/proxy.ts:611](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L611)

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:612](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L612)

---

### evaluatedAt

> **evaluatedAt**: `string`

Defined in: [types/proxy.ts:613](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L613)

---

### strategy

> **strategy**: [`ProxyAccountRoutingStrategy`](ProxyAccountRoutingStrategy.md)

Defined in: [types/proxy.ts:614](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L614)

---

### mode

> **mode**: [`ProxyAccountRoutingMode`](ProxyAccountRoutingMode.md)

Defined in: [types/proxy.ts:615](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L615)

---

### selectionReason

> **selectionReason**: [`ProxyAccountRoutingReason`](ProxyAccountRoutingReason.md)

Defined in: [types/proxy.ts:616](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L616)

---

### quotaRoutingEnabled

> **quotaRoutingEnabled**: `boolean`

Defined in: [types/proxy.ts:617](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L617)

---

### quotaInputsUsed

> **quotaInputsUsed**: `boolean`

Defined in: [types/proxy.ts:618](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L618)

---

### sessionSoftLimit

> **sessionSoftLimit**: `number`

Defined in: [types/proxy.ts:619](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L619)

---

### sessionResetToleranceMs

> **sessionResetToleranceMs**: `number`

Defined in: [types/proxy.ts:620](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L620)

---

### configuredPrimaryAccount

> **configuredPrimaryAccount**: `string` \| `null`

Defined in: [types/proxy.ts:621](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L621)

---

### configuredPrimaryMatched

> **configuredPrimaryMatched**: `boolean`

Defined in: [types/proxy.ts:622](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L622)

---

### rotationOffset

> **rotationOffset**: `number`

Defined in: [types/proxy.ts:623](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L623)

---

### initialAccount

> **initialAccount**: `string`

Defined in: [types/proxy.ts:624](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L624)

---

### candidates

> **candidates**: [`ProxyAccountRoutingCandidate`](ProxyAccountRoutingCandidate.md)[]

Defined in: [types/proxy.ts:625](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L625)
