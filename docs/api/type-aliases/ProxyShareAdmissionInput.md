[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareAdmissionInput

# Type Alias: ProxyShareAdmissionInput

> **ProxyShareAdmissionInput** = `object`

Defined in: [types/proxy.ts:4239](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4239)

Everything `evaluateShareAdmission` needs. Pure input — no I/O.

## Properties

### grant

> **grant**: [`ProxyShareGrant`](ProxyShareGrant.md)

Defined in: [types/proxy.ts:4240](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4240)

---

### now

> **now**: `number`

Defined in: [types/proxy.ts:4241](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4241)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/proxy.ts:4243](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4243)

Requested model, used against the model allowlist.

---

### counters

> **counters**: [`ProxyShareRuntimeCounters`](ProxyShareRuntimeCounters.md)

Defined in: [types/proxy.ts:4244](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4244)

---

### coinBalance?

> `optional` **coinBalance?**: `number`

Defined in: [types/proxy.ts:4246](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4246)

Remaining coins; omitted for an unlimited grant.
