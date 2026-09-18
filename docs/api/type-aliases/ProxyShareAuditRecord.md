[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareAuditRecord

# Type Alias: ProxyShareAuditRecord

> **ProxyShareAuditRecord** = `object`

Defined in: [types/proxy.ts:4595](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4595)

Rolling audit state for one complete-mode grant.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4596](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4596)

---

### accountLabel

> **accountLabel**: `string`

Defined in: [types/proxy.ts:4598](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4598)

The lender's own account the credential was provisioned from.

---

### lastObservation?

> `optional` **lastObservation?**: [`ProxyShareAuditObservation`](ProxyShareAuditObservation.md)

Defined in: [types/proxy.ts:4599](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4599)

---

### lenderRequestsTotal?

> `optional` **lenderRequestsTotal?**: `number`

Defined in: [types/proxy.ts:4602](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4602)

Running lifetime total of lender-served requests on the account, kept so
the next observation's delta can be computed.

---

### driftStreak

> **driftStreak**: `number`

Defined in: [types/proxy.ts:4604](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4604)

Consecutive heartbeats where the account moved but nothing was reported.

---

### lastDriftAt?

> `optional` **lastDriftAt?**: `number`

Defined in: [types/proxy.ts:4605](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4605)

---

### lastDriftDetail?

> `optional` **lastDriftDetail?**: `string`

Defined in: [types/proxy.ts:4606](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4606)

---

### autoPausedAt?

> `optional` **autoPausedAt?**: `number`

Defined in: [types/proxy.ts:4608](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4608)

Set once the streak crossed the tolerance and the grant was paused.
