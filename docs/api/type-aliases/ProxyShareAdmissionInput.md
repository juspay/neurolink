[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareAdmissionInput

# Type Alias: ProxyShareAdmissionInput

> **ProxyShareAdmissionInput** = `object`

Defined in: [types/proxy.ts:3626](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3626)

Everything `evaluateShareAdmission` needs. Pure input — no I/O.

## Properties

### grant

> **grant**: [`ProxyShareGrant`](ProxyShareGrant.md)

Defined in: [types/proxy.ts:3627](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3627)

---

### now

> **now**: `number`

Defined in: [types/proxy.ts:3628](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3628)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/proxy.ts:3630](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3630)

Requested model, used against the model allowlist.

---

### counters

> **counters**: [`ProxyShareRuntimeCounters`](ProxyShareRuntimeCounters.md)

Defined in: [types/proxy.ts:3631](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3631)

---

### coinBalance?

> `optional` **coinBalance?**: `number`

Defined in: [types/proxy.ts:3633](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3633)

Remaining coins; omitted for an unlimited grant.
