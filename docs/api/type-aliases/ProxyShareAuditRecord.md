[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareAuditRecord

# Type Alias: ProxyShareAuditRecord

> **ProxyShareAuditRecord** = `object`

Defined in: [types/proxy.ts:4915](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4915)

Rolling audit state for one complete-mode grant.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4916](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4916)

---

### accountLabel

> **accountLabel**: `string`

Defined in: [types/proxy.ts:4918](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4918)

The lender's own account the credential was provisioned from.

---

### lastObservation?

> `optional` **lastObservation?**: [`ProxyShareAuditObservation`](ProxyShareAuditObservation.md)

Defined in: [types/proxy.ts:4919](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4919)

---

### lenderRequestsTotal?

> `optional` **lenderRequestsTotal?**: `number`

Defined in: [types/proxy.ts:4922](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4922)

Running lifetime total of lender-served requests on the account, kept so
the next observation's delta can be computed.

---

### driftStreak

> **driftStreak**: `number`

Defined in: [types/proxy.ts:4924](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4924)

Consecutive heartbeats where the account moved but nothing was reported.

---

### lastDriftAt?

> `optional` **lastDriftAt?**: `number`

Defined in: [types/proxy.ts:4925](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4925)

---

### lastDriftDetail?

> `optional` **lastDriftDetail?**: `string`

Defined in: [types/proxy.ts:4926](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4926)

---

### autoPausedAt?

> `optional` **autoPausedAt?**: `number`

Defined in: [types/proxy.ts:4928](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4928)

Set once the streak crossed the tolerance and the grant was paused.
