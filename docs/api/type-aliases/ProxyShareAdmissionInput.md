[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareAdmissionInput

# Type Alias: ProxyShareAdmissionInput

> **ProxyShareAdmissionInput** = `object`

Defined in: [types/proxy.ts:4309](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4309)

Everything `evaluateShareAdmission` needs. Pure input — no I/O.

## Properties

### grant

> **grant**: [`ProxyShareGrant`](ProxyShareGrant.md)

Defined in: [types/proxy.ts:4310](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4310)

---

### now

> **now**: `number`

Defined in: [types/proxy.ts:4311](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4311)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/proxy.ts:4313](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4313)

Requested model, used against the model allowlist.

---

### counters

> **counters**: [`ProxyShareRuntimeCounters`](ProxyShareRuntimeCounters.md)

Defined in: [types/proxy.ts:4314](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4314)

---

### coinBalance?

> `optional` **coinBalance?**: `number`

Defined in: [types/proxy.ts:4316](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4316)

Remaining coins; omitted for an unlimited grant.
