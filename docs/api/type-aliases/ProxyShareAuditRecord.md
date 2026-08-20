[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareAuditRecord

# Type Alias: ProxyShareAuditRecord

> **ProxyShareAuditRecord** = `object`

Defined in: [types/proxy.ts:4125](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4125)

Rolling audit state for one complete-mode grant.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4126](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4126)

---

### accountLabel

> **accountLabel**: `string`

Defined in: [types/proxy.ts:4128](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4128)

The lender's own account the credential was provisioned from.

---

### lastObservation?

> `optional` **lastObservation?**: [`ProxyShareAuditObservation`](ProxyShareAuditObservation.md)

Defined in: [types/proxy.ts:4129](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4129)

---

### lenderRequestsTotal?

> `optional` **lenderRequestsTotal?**: `number`

Defined in: [types/proxy.ts:4132](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4132)

Running lifetime total of lender-served requests on the account, kept so
the next observation's delta can be computed.

---

### driftStreak

> **driftStreak**: `number`

Defined in: [types/proxy.ts:4134](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4134)

Consecutive heartbeats where the account moved but nothing was reported.

---

### lastDriftAt?

> `optional` **lastDriftAt?**: `number`

Defined in: [types/proxy.ts:4135](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4135)

---

### lastDriftDetail?

> `optional` **lastDriftDetail?**: `string`

Defined in: [types/proxy.ts:4136](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4136)

---

### autoPausedAt?

> `optional` **autoPausedAt?**: `number`

Defined in: [types/proxy.ts:4138](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4138)

Set once the streak crossed the tolerance and the grant was paused.
