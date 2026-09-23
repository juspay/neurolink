[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareAdmissionInput

# Type Alias: ProxyShareAdmissionInput

> **ProxyShareAdmissionInput** = `object`

Defined in: [types/proxy.ts:4236](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4236)

Everything `evaluateShareAdmission` needs. Pure input — no I/O.

## Properties

### grant

> **grant**: [`ProxyShareGrant`](ProxyShareGrant.md)

Defined in: [types/proxy.ts:4237](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4237)

---

### now

> **now**: `number`

Defined in: [types/proxy.ts:4238](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4238)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/proxy.ts:4240](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4240)

Requested model, used against the model allowlist.

---

### counters

> **counters**: [`ProxyShareRuntimeCounters`](ProxyShareRuntimeCounters.md)

Defined in: [types/proxy.ts:4241](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4241)

---

### coinBalance?

> `optional` **coinBalance?**: `number`

Defined in: [types/proxy.ts:4243](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4243)

Remaining coins; omitted for an unlimited grant.
