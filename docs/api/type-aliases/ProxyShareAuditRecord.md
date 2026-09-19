[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareAuditRecord

# Type Alias: ProxyShareAuditRecord

> **ProxyShareAuditRecord** = `object`

Defined in: [types/proxy.ts:4725](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4725)

Rolling audit state for one complete-mode grant.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4726](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4726)

---

### accountLabel

> **accountLabel**: `string`

Defined in: [types/proxy.ts:4728](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4728)

The lender's own account the credential was provisioned from.

---

### lastObservation?

> `optional` **lastObservation?**: [`ProxyShareAuditObservation`](ProxyShareAuditObservation.md)

Defined in: [types/proxy.ts:4729](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4729)

---

### lenderRequestsTotal?

> `optional` **lenderRequestsTotal?**: `number`

Defined in: [types/proxy.ts:4732](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4732)

Running lifetime total of lender-served requests on the account, kept so
the next observation's delta can be computed.

---

### driftStreak

> **driftStreak**: `number`

Defined in: [types/proxy.ts:4734](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4734)

Consecutive heartbeats where the account moved but nothing was reported.

---

### lastDriftAt?

> `optional` **lastDriftAt?**: `number`

Defined in: [types/proxy.ts:4735](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4735)

---

### lastDriftDetail?

> `optional` **lastDriftDetail?**: `string`

Defined in: [types/proxy.ts:4736](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4736)

---

### autoPausedAt?

> `optional` **autoPausedAt?**: `number`

Defined in: [types/proxy.ts:4738](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4738)

Set once the streak crossed the tolerance and the grant was paused.
