[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareAuditRecord

# Type Alias: ProxyShareAuditRecord

> **ProxyShareAuditRecord** = `object`

Defined in: [types/proxy.ts:4232](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4232)

Rolling audit state for one complete-mode grant.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4233](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4233)

---

### accountLabel

> **accountLabel**: `string`

Defined in: [types/proxy.ts:4235](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4235)

The lender's own account the credential was provisioned from.

---

### lastObservation?

> `optional` **lastObservation?**: [`ProxyShareAuditObservation`](ProxyShareAuditObservation.md)

Defined in: [types/proxy.ts:4236](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4236)

---

### lenderRequestsTotal?

> `optional` **lenderRequestsTotal?**: `number`

Defined in: [types/proxy.ts:4239](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4239)

Running lifetime total of lender-served requests on the account, kept so
the next observation's delta can be computed.

---

### driftStreak

> **driftStreak**: `number`

Defined in: [types/proxy.ts:4241](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4241)

Consecutive heartbeats where the account moved but nothing was reported.

---

### lastDriftAt?

> `optional` **lastDriftAt?**: `number`

Defined in: [types/proxy.ts:4242](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4242)

---

### lastDriftDetail?

> `optional` **lastDriftDetail?**: `string`

Defined in: [types/proxy.ts:4243](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4243)

---

### autoPausedAt?

> `optional` **autoPausedAt?**: `number`

Defined in: [types/proxy.ts:4245](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4245)

Set once the streak crossed the tolerance and the grant was paused.
