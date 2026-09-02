[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyAccountRoutingDecision

# Type Alias: ProxyAccountRoutingDecision

> **ProxyAccountRoutingDecision** = `object`

Defined in: [types/proxy.ts:606](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L606)

## Properties

### schemaVersion

> **schemaVersion**: `1`

Defined in: [types/proxy.ts:607](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L607)

---

### evaluatedAt

> **evaluatedAt**: `string`

Defined in: [types/proxy.ts:608](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L608)

---

### strategy

> **strategy**: [`ProxyAccountRoutingStrategy`](ProxyAccountRoutingStrategy.md)

Defined in: [types/proxy.ts:609](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L609)

---

### mode

> **mode**: [`ProxyAccountRoutingMode`](ProxyAccountRoutingMode.md)

Defined in: [types/proxy.ts:610](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L610)

---

### selectionReason

> **selectionReason**: [`ProxyAccountRoutingReason`](ProxyAccountRoutingReason.md)

Defined in: [types/proxy.ts:611](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L611)

---

### quotaRoutingEnabled

> **quotaRoutingEnabled**: `boolean`

Defined in: [types/proxy.ts:612](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L612)

---

### quotaInputsUsed

> **quotaInputsUsed**: `boolean`

Defined in: [types/proxy.ts:613](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L613)

---

### sessionSoftLimit

> **sessionSoftLimit**: `number`

Defined in: [types/proxy.ts:614](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L614)

---

### sessionResetToleranceMs

> **sessionResetToleranceMs**: `number`

Defined in: [types/proxy.ts:615](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L615)

---

### configuredPrimaryAccount

> **configuredPrimaryAccount**: `string` \| `null`

Defined in: [types/proxy.ts:616](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L616)

---

### configuredPrimaryMatched

> **configuredPrimaryMatched**: `boolean`

Defined in: [types/proxy.ts:617](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L617)

---

### rotationOffset

> **rotationOffset**: `number`

Defined in: [types/proxy.ts:618](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L618)

---

### initialAccount

> **initialAccount**: `string`

Defined in: [types/proxy.ts:619](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L619)

---

### candidates

> **candidates**: [`ProxyAccountRoutingCandidate`](ProxyAccountRoutingCandidate.md)[]

Defined in: [types/proxy.ts:620](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L620)
