[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareAdmissionInput

# Type Alias: ProxyShareAdmissionInput

> **ProxyShareAdmissionInput** = `object`

Defined in: [types/proxy.ts:3989](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3989)

Everything `evaluateShareAdmission` needs. Pure input — no I/O.

## Properties

### grant

> **grant**: [`ProxyShareGrant`](ProxyShareGrant.md)

Defined in: [types/proxy.ts:3990](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3990)

---

### now

> **now**: `number`

Defined in: [types/proxy.ts:3991](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3991)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/proxy.ts:3993](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3993)

Requested model, used against the model allowlist.

---

### counters

> **counters**: [`ProxyShareRuntimeCounters`](ProxyShareRuntimeCounters.md)

Defined in: [types/proxy.ts:3994](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3994)

---

### coinBalance?

> `optional` **coinBalance?**: `number`

Defined in: [types/proxy.ts:3996](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3996)

Remaining coins; omitted for an unlimited grant.
