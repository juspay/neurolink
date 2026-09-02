[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareAuditRecord

# Type Alias: ProxyShareAuditRecord

> **ProxyShareAuditRecord** = `object`

Defined in: [types/proxy.ts:4217](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4217)

Rolling audit state for one complete-mode grant.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4218](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4218)

---

### accountLabel

> **accountLabel**: `string`

Defined in: [types/proxy.ts:4220](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4220)

The lender's own account the credential was provisioned from.

---

### lastObservation?

> `optional` **lastObservation?**: [`ProxyShareAuditObservation`](ProxyShareAuditObservation.md)

Defined in: [types/proxy.ts:4221](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4221)

---

### lenderRequestsTotal?

> `optional` **lenderRequestsTotal?**: `number`

Defined in: [types/proxy.ts:4224](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4224)

Running lifetime total of lender-served requests on the account, kept so
the next observation's delta can be computed.

---

### driftStreak

> **driftStreak**: `number`

Defined in: [types/proxy.ts:4226](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4226)

Consecutive heartbeats where the account moved but nothing was reported.

---

### lastDriftAt?

> `optional` **lastDriftAt?**: `number`

Defined in: [types/proxy.ts:4227](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4227)

---

### lastDriftDetail?

> `optional` **lastDriftDetail?**: `string`

Defined in: [types/proxy.ts:4228](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4228)

---

### autoPausedAt?

> `optional` **autoPausedAt?**: `number`

Defined in: [types/proxy.ts:4230](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4230)

Set once the streak crossed the tolerance and the grant was paused.
