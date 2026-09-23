[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareAdmissionInput

# Type Alias: ProxyShareAdmissionInput

> **ProxyShareAdmissionInput** = `object`

Defined in: [types/proxy.ts:4216](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4216)

Everything `evaluateShareAdmission` needs. Pure input — no I/O.

## Properties

### grant

> **grant**: [`ProxyShareGrant`](ProxyShareGrant.md)

Defined in: [types/proxy.ts:4217](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4217)

---

### now

> **now**: `number`

Defined in: [types/proxy.ts:4218](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4218)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/proxy.ts:4220](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4220)

Requested model, used against the model allowlist.

---

### counters

> **counters**: [`ProxyShareRuntimeCounters`](ProxyShareRuntimeCounters.md)

Defined in: [types/proxy.ts:4221](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4221)

---

### coinBalance?

> `optional` **coinBalance?**: `number`

Defined in: [types/proxy.ts:4223](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4223)

Remaining coins; omitted for an unlimited grant.
