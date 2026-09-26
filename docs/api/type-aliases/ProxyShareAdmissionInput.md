[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareAdmissionInput

# Type Alias: ProxyShareAdmissionInput

> **ProxyShareAdmissionInput** = `object`

Defined in: [types/proxy.ts:4371](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4371)

Everything `evaluateShareAdmission` needs. Pure input — no I/O.

## Properties

### grant

> **grant**: [`ProxyShareGrant`](ProxyShareGrant.md)

Defined in: [types/proxy.ts:4372](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4372)

---

### now

> **now**: `number`

Defined in: [types/proxy.ts:4373](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4373)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/proxy.ts:4375](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4375)

Requested model, used against the model allowlist.

---

### counters

> **counters**: [`ProxyShareRuntimeCounters`](ProxyShareRuntimeCounters.md)

Defined in: [types/proxy.ts:4376](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4376)

---

### coinBalance?

> `optional` **coinBalance?**: `number`

Defined in: [types/proxy.ts:4378](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4378)

Remaining coins; omitted for an unlimited grant.
