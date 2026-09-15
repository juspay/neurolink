[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareAdmissionInput

# Type Alias: ProxyShareAdmissionInput

> **ProxyShareAdmissionInput** = `object`

Defined in: [types/proxy.ts:3964](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3964)

Everything `evaluateShareAdmission` needs. Pure input — no I/O.

## Properties

### grant

> **grant**: [`ProxyShareGrant`](ProxyShareGrant.md)

Defined in: [types/proxy.ts:3965](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3965)

---

### now

> **now**: `number`

Defined in: [types/proxy.ts:3966](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3966)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/proxy.ts:3968](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3968)

Requested model, used against the model allowlist.

---

### counters

> **counters**: [`ProxyShareRuntimeCounters`](ProxyShareRuntimeCounters.md)

Defined in: [types/proxy.ts:3969](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3969)

---

### coinBalance?

> `optional` **coinBalance?**: `number`

Defined in: [types/proxy.ts:3971](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3971)

Remaining coins; omitted for an unlimited grant.
