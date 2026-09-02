[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareAuditRecord

# Type Alias: ProxyShareAuditRecord

> **ProxyShareAuditRecord** = `object`

Defined in: [types/proxy.ts:4226](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4226)

Rolling audit state for one complete-mode grant.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4227](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4227)

---

### accountLabel

> **accountLabel**: `string`

Defined in: [types/proxy.ts:4229](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4229)

The lender's own account the credential was provisioned from.

---

### lastObservation?

> `optional` **lastObservation?**: [`ProxyShareAuditObservation`](ProxyShareAuditObservation.md)

Defined in: [types/proxy.ts:4230](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4230)

---

### lenderRequestsTotal?

> `optional` **lenderRequestsTotal?**: `number`

Defined in: [types/proxy.ts:4233](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4233)

Running lifetime total of lender-served requests on the account, kept so
the next observation's delta can be computed.

---

### driftStreak

> **driftStreak**: `number`

Defined in: [types/proxy.ts:4235](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4235)

Consecutive heartbeats where the account moved but nothing was reported.

---

### lastDriftAt?

> `optional` **lastDriftAt?**: `number`

Defined in: [types/proxy.ts:4236](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4236)

---

### lastDriftDetail?

> `optional` **lastDriftDetail?**: `string`

Defined in: [types/proxy.ts:4237](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4237)

---

### autoPausedAt?

> `optional` **autoPausedAt?**: `number`

Defined in: [types/proxy.ts:4239](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4239)

Set once the streak crossed the tolerance and the grant was paused.
