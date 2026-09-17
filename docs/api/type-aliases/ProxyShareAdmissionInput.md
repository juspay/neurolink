[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareAdmissionInput

# Type Alias: ProxyShareAdmissionInput

> **ProxyShareAdmissionInput** = `object`

Defined in: [types/proxy.ts:3968](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3968)

Everything `evaluateShareAdmission` needs. Pure input — no I/O.

## Properties

### grant

> **grant**: [`ProxyShareGrant`](ProxyShareGrant.md)

Defined in: [types/proxy.ts:3969](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3969)

---

### now

> **now**: `number`

Defined in: [types/proxy.ts:3970](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3970)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/proxy.ts:3972](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3972)

Requested model, used against the model allowlist.

---

### counters

> **counters**: [`ProxyShareRuntimeCounters`](ProxyShareRuntimeCounters.md)

Defined in: [types/proxy.ts:3973](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3973)

---

### coinBalance?

> `optional` **coinBalance?**: `number`

Defined in: [types/proxy.ts:3975](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3975)

Remaining coins; omitted for an unlimited grant.
